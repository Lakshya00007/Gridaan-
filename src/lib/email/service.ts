import 'server-only';

import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/server';
import { serverEnv } from '@/lib/env.server';
import { getPublishedBusinessInfo } from '@/lib/business-info.server';
import type { Order } from '@/types';
import type { ShipmentRecord } from '@/lib/shipping/types';
import { renderAdminOrderEmail, renderOrderEmail } from './templates';

export type OrderEmailEvent = 'order_confirmation' | 'order_shipped' | 'order_delivered' | 'order_cancelled' | 'admin_new_order';

function logError(orderId: string, eventType: OrderEmailEvent, error: unknown) {
  console.error('[email]', { order_id: orderId, event_type: eventType, error: error instanceof Error ? error.message : String(error) });
}

export async function sendOrderEmailEvent({ orderId, eventType }: { orderId: string; eventType: OrderEmailEvent }) {
  if (!serverEnv.RESEND_API_KEY || !serverEnv.RESEND_FROM_EMAIL) {
    console.warn('[email] Resend is not configured; email event skipped', { order_id: orderId, event_type: eventType });
    return { sent: false, skipped: true, reason: 'resend_not_configured' as const };
  }
  const supabase = createServiceClient();
  const { data: claimed, error: claimError } = await supabase.from('order_email_events').insert({
    order_id: orderId,
    event_type: eventType,
    status: 'pending',
  }).select('id').maybeSingle();
  if (claimError?.code === '23505') return { sent: false, skipped: true, reason: 'already_attempted' as const };
  if (claimError || !claimed) {
    logError(orderId, eventType, claimError ?? new Error('Email event claim returned no row'));
    return { sent: false, skipped: false, reason: 'claim_failed' as const };
  }

  try {
    const { data: rawOrder, error: orderError } = await supabase.from('orders').select('*, items:order_items(*)').eq('id', orderId).single();
    if (orderError || !rawOrder) throw orderError ?? new Error('Order not found');
    const order = rawOrder as unknown as Order;
    const { data: shipment } = await supabase.from('shipments').select('*').eq('order_id', orderId).eq('direction', 'outbound').order('created_at', { ascending: false }).limit(1).maybeSingle();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const number = order.order_number ?? order.checkout_reference ?? order.id.slice(0, 8);
    const isAdmin = eventType === 'admin_new_order';
    const recipient = isAdmin ? serverEnv.ADMIN_ORDER_EMAIL : order.customer_email;
    if (!recipient) throw new Error(isAdmin ? 'ADMIN_ORDER_EMAIL is not configured' : 'Order has no customer email');
    const email = isAdmin
      ? renderAdminOrderEmail({ order, orderUrl: `${siteUrl}/admin/orders/${order.id}` })
      : renderOrderEmail({ kind: eventType.replace('order_', '') as 'confirmation' | 'shipped' | 'delivered' | 'cancelled', order, shipment: shipment as ShipmentRecord | null, orderUrl: `${siteUrl}/order-success?order=${encodeURIComponent(number)}`, supportEmail: getPublishedBusinessInfo().supportEmail ?? undefined });
    const resend = new Resend(serverEnv.RESEND_API_KEY);
    const result = await resend.emails.send({ from: serverEnv.RESEND_FROM_EMAIL, to: recipient, subject: email.subject, html: email.html });
    if (result.error) throw new Error(result.error.message);
    await supabase.from('order_email_events').update({ status: 'sent', recipient_email: recipient, provider_message_id: result.data?.id ?? null, sent_at: new Date().toISOString() }).eq('id', claimed.id);
    console.info('[email] sent', { order_id: orderId, event_type: eventType, provider_message_id: result.data?.id });
    return { sent: true, messageId: result.data?.id ?? null };
  } catch (error) {
    await supabase.from('order_email_events').update({ status: 'failed', recipient_email: eventType === 'admin_new_order' ? serverEnv.ADMIN_ORDER_EMAIL : null, error: error instanceof Error ? error.message : String(error) }).eq('id', claimed.id);
    logError(orderId, eventType, error);
    return { sent: false, skipped: false, reason: 'send_failed' as const };
  }
}
