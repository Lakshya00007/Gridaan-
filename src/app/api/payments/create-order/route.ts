import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { assertJsonRequest, assertSameOrigin, badRequest, errorResponse, notFound } from '@/lib/api';
import { createPaymentOrderSchema } from '@/lib/payments/payment-validation';
import { createPaymentOrderForOrder } from '@/lib/payments/payment-service';

export async function POST(req: NextRequest) {
  try {
    assertJsonRequest(req);
    assertSameOrigin(req);

    const input = createPaymentOrderSchema.parse(await req.json());
    const supabase = createServiceClient();
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, checkout_reference, payment_status, order_status, payment_method')
      .eq('id', input.order_id)
      .maybeSingle();

    if (error) throw error;
    if (!order) throw notFound('Checkout not found');
    if (order.checkout_reference && input.checkout_reference !== order.checkout_reference) {
      throw badRequest('Checkout reference mismatch', 'checkout_reference_mismatch');
    }
    if (order.payment_method !== 'razorpay') throw badRequest('Only Razorpay online payments are supported', 'online_payment_only');
    if (order.payment_status === 'captured' || order.order_status === 'placed') {
      throw badRequest('Order is already placed', 'order_already_placed');
    }

    const result = await createPaymentOrderForOrder({
      orderId: input.order_id,
      idempotencyKey: input.idempotency_key ?? req.headers.get('idempotency-key') ?? undefined,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      message: 'Razorpay payment order prepared.',
    });
  } catch (error) {
    return errorResponse(error);
  }
}
