import 'server-only';

import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/server';
import { serverEnv } from '@/lib/env.server';
import { getPublishedBusinessInfo } from '@/lib/business-info.server';
import type { Order } from '@/types';
import type { ShipmentRecord } from '@/lib/shipping/types';
import { renderAdminOrderEmail, renderOrderEmail } from './templates';

export type OrderEmailEvent = 'order_confirmation' | 'order_shipped' | 'order_delivered' | 'order_cancelled' | 'admin_new_order';

type EmailPayload = { from: string; to: string; subject: string; html: string };
type ClaimedEmail = {
  id: string;
  claim_id: string | null;
  attempt_count: number;
  payload: EmailPayload | null;
  claim_result: 'claimed' | 'already_sent' | 'already_claimed' | 'needs_review';
};

function logError(orderId: string, eventType: OrderEmailEvent, error: unknown) {
  console.error('[email]', {
    order_id: orderId,
    event_type: eventType,
    error: error instanceof Error ? error.message : String(error),
  });
}

async function renderPayload(orderId: string, eventType: OrderEmailEvent): Promise<EmailPayload> {
  const supabase = createServiceClient();
  const { data: rawOrder, error: orderError } = await supabase
    .from('orders').select('*, items:order_items(*)').eq('id', orderId).single();
  if (orderError || !rawOrder) throw orderError ?? new Error('Order not found');
  const order = rawOrder as unknown as Order;
  let shipment: ShipmentRecord | null = null;
  if (eventType === 'order_shipped') {
    const result = await supabase
      .from('shipments').select('*').eq('order_id', orderId).eq('direction', 'outbound')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (result.error) throw result.error;
    shipment = result.data as ShipmentRecord | null;
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const number = order.order_number ?? order.checkout_reference ?? order.id.slice(0, 8);
  const isAdmin = eventType === 'admin_new_order';
  const recipient = isAdmin ? serverEnv.ADMIN_ORDER_EMAIL : order.customer_email;
  if (!recipient) throw new Error(isAdmin ? 'ADMIN_ORDER_EMAIL is not configured' : 'Order has no customer email');
  const email = isAdmin
    ? renderAdminOrderEmail({ order, orderUrl: `${siteUrl}/admin/orders/${order.id}` })
    : renderOrderEmail({
      kind: eventType.replace('order_', '') as 'confirmation' | 'shipped' | 'delivered' | 'cancelled',
      order,
      shipment,
      orderUrl: `${siteUrl}/order-success?order=${encodeURIComponent(number)}`,
      supportEmail: getPublishedBusinessInfo().supportEmail ?? undefined,
    });
  return { from: serverEnv.RESEND_FROM_EMAIL!, to: recipient, subject: email.subject, html: email.html };
}

/** Send one order event. The database owns claims; Resend owns 24-hour send deduplication. */
export async function sendOrderEmailEvent({ orderId, eventType }: { orderId: string; eventType: OrderEmailEvent }) {
  if (!serverEnv.RESEND_API_KEY || !serverEnv.RESEND_FROM_EMAIL) {
    console.warn('[email] Resend is not configured; email event remains queued', { order_id: orderId, event_type: eventType });
    return { sent: false, skipped: true, reason: 'resend_not_configured' as const };
  }

  const supabase = createServiceClient();
  const { data: rows, error: claimError } = await supabase.rpc('claim_order_email_event', {
    p_order_id: orderId,
    p_event_type: eventType,
    p_lease_seconds: 600,
  });
  const claim = (Array.isArray(rows) ? rows[0] : rows) as ClaimedEmail | null;
  if (claimError || !claim) {
    logError(orderId, eventType, claimError ?? new Error('Email claim returned no row'));
    return { sent: false, skipped: false, reason: 'claim_failed' as const };
  }
  if (claim.claim_result !== 'claimed' || !claim.claim_id) {
    return { sent: false, skipped: true, reason: claim.claim_result };
  }

  let payload: EmailPayload | null = claim.payload;
  let messageId: string | null = null;
  try {
    if (!payload) {
      payload = await renderPayload(orderId, eventType);
      // Save the exact email before calling the provider. Retries must reuse the same
      // payload with the same idempotency key if the provider outcome is ambiguous.
      const { data: stored, error: payloadError } = await supabase
        .from('order_email_events').update({ payload }).eq('id', claim.id)
        .eq('claim_id', claim.claim_id).eq('status', 'processing').select('id').maybeSingle();
      if (payloadError || !stored) throw payloadError ?? new Error('Email payload claim was lost');
    }
    const resend = new Resend(serverEnv.RESEND_API_KEY);
    const result = await resend.emails.send(payload, {
      idempotencyKey: `order-email/${eventType}/${orderId}`,
    });
    if (result.error) throw new Error(result.error.message);
    if (!result.data?.id) throw new Error('Resend did not return a message ID');
    messageId = result.data.id;
  } catch (error) {
    const { data: finished, error: finishError } = await supabase.rpc('finish_order_email_event', {
      p_id: claim.id,
      p_claim_id: claim.claim_id,
      p_status: 'failed',
      p_recipient_email: payload?.to ?? null,
      p_provider_message_id: null,
      p_error: error instanceof Error ? error.message : String(error),
    });
    if (finishError || !finished) logError(orderId, eventType, finishError ?? new Error('Failure state could not be recorded'));
    logError(orderId, eventType, error);
    return { sent: false, skipped: false, reason: 'send_failed' as const };
  }

  const { data: finished, error: finishError } = await supabase.rpc('finish_order_email_event', {
    p_id: claim.id,
    p_claim_id: claim.claim_id,
    p_status: 'sent',
    p_recipient_email: payload!.to,
    p_provider_message_id: messageId,
    p_error: null,
  });
  if (finishError || !finished) {
    // Preserve processing state. A lease retry reuses the stored payload and
    // provider idempotency key instead of risking an immediate second email.
    logError(orderId, eventType, finishError ?? new Error('Sent state could not be recorded'));
    return { sent: false, skipped: false, reason: 'bookkeeping_failed' as const };
  }
  console.info('[email] accepted by provider', { order_id: orderId, event_type: eventType, provider_message_id: messageId });
  return { sent: true, messageId };
}
