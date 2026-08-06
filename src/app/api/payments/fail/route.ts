import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertJsonRequest, assertSameOrigin, badRequest, errorResponse, notFound } from '@/lib/api';
import { markPaymentAttemptFailed } from '@/lib/payments/payment-service';
import { createServiceClient } from '@/lib/supabase/server';

const failSchema = z.object({
  order_id: z.string().uuid(),
  checkout_reference: z.string().trim().min(8).max(80).optional(),
  payment_id: z.string().uuid().optional(),
  gateway_order_id: z.string().trim().min(3).max(120).optional(),
  gateway_payment_id: z.string().trim().min(3).max(120).optional(),
  error_code: z.string().trim().min(2).max(120),
  error_message: z.string().trim().min(2).max(500),
  release_reservation: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    assertJsonRequest(req);
    assertSameOrigin(req);
    const input = failSchema.parse(await req.json());
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

    const result = await markPaymentAttemptFailed({
      orderId: input.order_id,
      paymentId: input.payment_id,
      gatewayOrderId: input.gateway_order_id,
      gatewayPaymentId: input.gateway_payment_id,
      errorCode: input.error_code,
      errorMessage: input.error_message,
      releaseReservation: input.release_reservation,
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
