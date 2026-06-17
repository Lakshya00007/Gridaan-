import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyRzpSignature } from '@/lib/razorpay';
import { assertJsonRequest, assertSameOrigin, errorResponse, badRequest, notFound } from '@/lib/api';
import { revalidatePath } from 'next/cache';
import { isRateLimited, getClientIdentifier } from '@/lib/rate-limit';
import type { OrderSuccessSummary } from '@/types';

const schema = z.object({
  order_id: z.string().uuid(),
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

/**
 * POST /api/razorpay/verify
 *
 * Called by the client after a successful Razorpay checkout.
 * Verifies the HMAC-SHA256 signature server-side (NEVER trust the
 * client), then marks the order as paid.
 */
export async function POST(req: NextRequest) {
  // Rate limiting: max 5 payment verifications per minute per client
  const clientId = getClientIdentifier(req);
  if (isRateLimited(clientId, { limit: 5, windowSec: 60 })) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    assertJsonRequest(req);
    assertSameOrigin(req);

    const input = schema.parse(await req.json());
    console.info('[razorpay/verify] verification request', {
      orderId: input.order_id,
      razorpayOrderId: input.razorpay_order_id,
      razorpayPaymentId: input.razorpay_payment_id,
    });
    const valid = verifyRzpSignature({
      orderId: input.razorpay_order_id,
      paymentId: input.razorpay_payment_id,
      signature: input.razorpay_signature,
    });
    if (!valid) throw badRequest('Invalid signature', 'invalid_signature');

    const supabase = createServiceClient();
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, razorpay_order_id, payment_status')
      .eq('id', input.order_id)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) throw notFound('Order not found');
    if (order.razorpay_order_id !== input.razorpay_order_id) {
      throw badRequest('Razorpay order mismatch', 'order_mismatch');
    }
    if (order.payment_status === 'paid') {
      const { data: paidOrder } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, total, payment_method, payment_status, order_status, razorpay_order_id, created_at')
        .eq('id', input.order_id)
        .single();
      return NextResponse.json({ ok: true, order: paidOrder });
    }

    const { error: rpcError } = await supabase.rpc('mark_order_paid', {
      p_order_id: input.order_id,
      p_razorpay_order_id: input.razorpay_order_id,
      p_razorpay_payment_id: input.razorpay_payment_id,
      p_razorpay_signature: input.razorpay_signature,
    });
    if (rpcError) throw rpcError;

    const { data: paidOrder, error: paidOrderError } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, total, payment_method, payment_status, order_status, razorpay_order_id, created_at')
      .eq('id', input.order_id)
      .single();
    if (paidOrderError) throw paidOrderError;
    const paidOrderSummary = paidOrder as OrderSuccessSummary;

    // Notify admin + customer via WhatsApp (best-effort)
    try {
      const { data: order } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', input.order_id)
        .single();
      if (order) {
        const { buildAdminOrderLink, buildCustomerOrderLink, sendWhatsApp } = await import('@/lib/whatsapp');
        // Fire and forget. Deep link works without API.
        void buildAdminOrderLink(order);
        void buildCustomerOrderLink(order);
        if (order.customer_phone) {
          void sendWhatsApp(`91${order.customer_phone}`, `Your order ${order.order_number} is confirmed!`);
        }
      }
    } catch (e) {
      console.warn('WhatsApp notify failed:', e);
    }

    revalidatePath('/admin/orders');
    revalidatePath(`/order-success?order=${paidOrderSummary.order_number}`);
    console.info('[razorpay/verify] verification complete', {
      orderId: paidOrderSummary.id,
      orderNumber: paidOrderSummary.order_number,
      paymentStatus: paidOrderSummary.payment_status,
    });
    return NextResponse.json({ ok: true, order: paidOrderSummary });
  } catch (err) {
    return errorResponse(err);
  }
}
