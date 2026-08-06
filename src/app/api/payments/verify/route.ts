import { NextRequest, NextResponse } from 'next/server';
import { assertJsonRequest, assertSameOrigin, badRequest, errorResponse, notFound } from '@/lib/api';
import { verifyPaymentSchema } from '@/lib/payments/payment-validation';
import { verifyPaymentCallback } from '@/lib/payments/payment-service';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    assertJsonRequest(req);
    assertSameOrigin(req);

    const input = verifyPaymentSchema.parse(await req.json());
    const supabase = createServiceClient();
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, checkout_reference')
      .eq('id', input.order_id)
      .maybeSingle();

    if (error) throw error;
    if (!order) throw notFound('Checkout not found');
    if (order.checkout_reference && input.checkout_reference !== order.checkout_reference) {
      throw badRequest('Checkout reference mismatch', 'checkout_reference_mismatch');
    }

    const result = await verifyPaymentCallback({
      orderId: input.order_id,
      gatewayOrderId: input.gateway_order_id,
      gatewayPaymentId: input.gateway_payment_id,
      signature: input.signature,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      paid: Boolean(result.placed),
      requires_webhook_confirmation: !result.placed,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
