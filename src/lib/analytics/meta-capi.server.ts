import 'server-only';

import { META_GRAPH_API_VERSION, META_PRODUCTION_HOST, isValidMetaPixelId } from './config';
import { isSuccessfulMetaCapiResponse } from './meta-capi-response';
import {
  META_CAPI_CLAIM_LEASE_SECONDS,
  type MetaConversionStatus,
} from './meta-capi-state';
import { buildServerPurchaseEvent } from './meta-events';
import { getMetaUserData, hasOrderMarketingConsent } from './meta-capi-utils';
import { serverEnv } from '@/lib/env.server';
import { createServiceClient } from '@/lib/supabase/server';
import type { OrderItem } from '@/types';

type MetaConversionClaimRow = {
  id: string;
  event_id: string;
  event_name: 'Purchase';
  order_id: string;
  status: MetaConversionStatus;
  attempt_count: number;
  event_time: number;
  claim_id: string | null;
  claim_result?: 'claimed' | 'already_sent' | 'already_claimed' | 'skipped' | 'not_claimed';
  skip_result?: 'skipped' | 'already_sent' | 'already_claimed' | MetaConversionStatus;
};

type MetaOrderRow = {
  id: string;
  order_number: string | null;
  customer_email: string | null;
  customer_phone: string;
  final_amount: number | null;
  total: number;
  payment_status: string;
  order_status: string;
  metadata: Record<string, unknown>;
  items?: Pick<OrderItem, 'product_id' | 'quantity' | 'unit_price'>[];
};

function getOrderValue(order: Pick<MetaOrderRow, 'final_amount' | 'total'>) {
  return Number(order.final_amount ?? order.total ?? 0);
}

function getOrderSuccessUrl(orderNumber: string) {
  return `https://${META_PRODUCTION_HOST}/order-success?order=${encodeURIComponent(orderNumber)}`;
}

function toUnixSeconds(value: string | null | undefined) {
  const timestamp = Date.parse(String(value ?? ''));
  if (!Number.isFinite(timestamp)) return null;
  const seconds = Math.floor(timestamp / 1000);
  return seconds > 0 ? seconds : null;
}

async function getStablePurchaseEventTime(orderId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('payments')
    .select('captured_at')
    .eq('order_id', orderId)
    .eq('captured', true)
    .not('captured_at', 'is', null)
    .order('captured_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return toUnixSeconds(data?.captured_at);
}

async function skipMetaConversionEvent({
  orderId,
  eventId,
  eventTime,
  safeErrorCode,
}: {
  orderId: string;
  eventId: string;
  eventTime: number;
  safeErrorCode: string;
}) {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('skip_meta_conversion_event', {
    p_event_id: eventId,
    p_event_name: 'Purchase',
    p_order_id: orderId,
    p_event_time: eventTime,
    p_safe_error_code: safeErrorCode,
    p_lease_seconds: META_CAPI_CLAIM_LEASE_SECONDS,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as MetaConversionClaimRow | null;
}

async function claimMetaConversionEvent({
  eventId,
  orderId,
  eventTime,
}: {
  eventId: string;
  orderId: string;
  eventTime: number;
}) {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('claim_meta_conversion_event', {
    p_event_id: eventId,
    p_event_name: 'Purchase',
    p_order_id: orderId,
    p_event_time: eventTime,
    p_lease_seconds: META_CAPI_CLAIM_LEASE_SECONDS,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as MetaConversionClaimRow | null;
}

async function completeMetaConversionClaim({
  claim,
  status,
  safeErrorCode,
}: {
  claim: MetaConversionClaimRow;
  status: 'sent' | 'failed';
  safeErrorCode?: string;
}) {
  if (!claim.claim_id) return false;
  const now = new Date().toISOString();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('meta_conversion_events')
    .update({
      status,
      claim_id: null,
      processing_started_at: null,
      ...(status === 'sent'
        ? { sent_at: now, safe_error_code: null }
        : { safe_error_code: safeErrorCode }),
      updated_at: now,
    })
    .eq('id', claim.id)
    .eq('claim_id', claim.claim_id)
    .eq('status', 'processing')
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function sendMetaCapiPurchase({
  eventId,
  eventTime,
  order,
  customData,
}: {
  eventId: string;
  eventTime: number;
  order: MetaOrderRow & { order_number: string };
  customData: ReturnType<typeof buildServerPurchaseEvent>['data'];
}) {
  const pixelId = serverEnv.NEXT_PUBLIC_META_PIXEL_ID;
  const token = serverEnv.META_CAPI_ACCESS_TOKEN;
  if (!serverEnv.META_CAPI_ENABLED || !token || !isValidMetaPixelId(pixelId)) {
    return { ok: false as const, code: 'meta_capi_not_configured' };
  }

  const userData = getMetaUserData({
    email: order.customer_email,
    phone: order.customer_phone,
  });
  if (Object.keys(userData).length === 0) {
    return { ok: false as const, code: 'meta_user_data_unavailable' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const endpoint = new URL(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/${pixelId}/events`);
    endpoint.searchParams.set('access_token', token);
    const body = {
      data: [
        {
          event_name: 'Purchase',
          event_time: eventTime,
          event_id: eventId,
          action_source: 'website',
          event_source_url: getOrderSuccessUrl(order.order_number),
          user_data: userData,
          custom_data: customData,
        },
      ],
      ...(serverEnv.META_CAPI_TEST_EVENT_CODE
        ? { test_event_code: serverEnv.META_CAPI_TEST_EVENT_CODE }
        : {}),
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false as const, code: `meta_http_${response.status}` };
    }
    if (!isSuccessfulMetaCapiResponse(response.ok, payload)) {
      return { ok: false as const, code: 'meta_malformed_response' };
    }
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      code: error instanceof DOMException && error.name === 'AbortError' ? 'meta_timeout' : 'meta_request_failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function ensureMetaPurchaseEvent({
  orderId,
  source,
}: {
  orderId: string;
  source: string;
}) {
  if (!serverEnv.META_CAPI_ENABLED) return { ok: true, skipped: 'disabled' as const };

  const supabase = createServiceClient();

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_email, customer_phone, final_amount, total, payment_status, order_status, metadata, items:order_items(product_id, quantity, unit_price)')
      .eq('id', orderId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, skipped: 'order_not_found' as const };

    const order = data as MetaOrderRow;
    if (
      !order.order_number ||
      order.payment_status !== 'captured' ||
      order.order_status !== 'placed'
    ) {
      return { ok: true, skipped: 'not_captured_placed' as const };
    }

    const purchase = buildServerPurchaseEvent({
      orderNumber: order.order_number,
      value: getOrderValue(order),
      items: order.items ?? [],
    });
    const eventTime = await getStablePurchaseEventTime(orderId);
    if (!eventTime) {
      return { ok: false, skipped: 'capture_time_unavailable' as const };
    }

    if (!hasOrderMarketingConsent(order.metadata)) {
      await skipMetaConversionEvent({
        orderId,
        eventId: purchase.eventId,
        eventTime,
        safeErrorCode: 'marketing_consent_not_granted',
      });
      return { ok: true, skipped: 'marketing_consent_not_granted' as const };
    }

    const claim = await claimMetaConversionEvent({
      eventId: purchase.eventId,
      orderId,
      eventTime,
    });
    if (!claim || claim.claim_result !== 'claimed' || !claim.claim_id) {
      return { ok: true, skipped: claim?.claim_result ?? ('not_claimed' as const) };
    }

    const result = await sendMetaCapiPurchase({
      eventId: purchase.eventId,
      eventTime: claim.event_time,
      order: order as MetaOrderRow & { order_number: string },
      customData: purchase.data,
    });

    if (result.ok) {
      await completeMetaConversionClaim({ claim, status: 'sent' });
      return { ok: true, sent: true as const };
    }

    await completeMetaConversionClaim({
      claim,
      status: 'failed',
      safeErrorCode: result.code,
    });

    console.warn('[meta-capi] purchase send failed', {
      eventId: purchase.eventId,
      orderId,
      source,
      code: result.code,
    });
    return { ok: false, code: result.code };
  } catch (error) {
    console.warn('[meta-capi] purchase processing failed', {
      orderId,
      source,
      code: error instanceof Error ? error.name : 'unknown_error',
    });
    return { ok: false, code: 'meta_processing_failed' };
  }
}
