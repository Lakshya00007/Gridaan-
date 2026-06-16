import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { createServiceClient } from '@/lib/supabase/server';
import { errorResponse } from '@/lib/api';

type RazorpayPaymentEntity = {
  id?: string;
  order_id?: string;
};

type RazorpayOrderEntity = {
  id?: string;
};

type RazorpayWebhookEvent = {
  event?: string;
  payload?: {
    payment?: {
      entity?: RazorpayPaymentEntity;
    };
    order?: {
      entity?: RazorpayOrderEntity;
    };
  };
};

/**
 * POST /api/webhooks/razorpay
 *
 * Razorpay sends payment lifecycle events here.
 * Verify webhook signature first, then update order state.
 */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();

    const signature =
      req.headers.get('x-razorpay-signature') ?? '';

    if (!verifyWebhookSignature(raw, signature)) {
      return NextResponse.json(
        { error: 'invalid_signature' },
        { status: 400 }
      );
    }

    const event = JSON.parse(raw) as RazorpayWebhookEvent;

    const supabase = createServiceClient();

    if (
      event.event === 'payment.captured' ||
      event.event === 'order.paid'
    ) {
      const paymentEntity =
        event.payload?.payment?.entity;

      const orderEntity =
        event.payload?.order?.entity;

      const rzpOrderId =
        paymentEntity?.order_id ??
        orderEntity?.id ??
        null;

      const paymentId =
        paymentEntity?.id ?? null;

      if (rzpOrderId) {
        const { data: order } = await supabase
          .from('orders')
          .select('id, payment_status')
          .eq('razorpay_order_id', rzpOrderId)
          .maybeSingle();

        if (
          order &&
          order.payment_status !== 'paid'
        ) {
          await supabase
            .from('orders')
            .update({
              payment_status: 'paid',
              razorpay_payment_id:
                paymentId ?? undefined,
            })
            .eq('id', order.id);
        }
      }
    } else if (event.event === 'payment.failed') {
      const paymentEntity =
        event.payload?.payment?.entity;

      const rzpOrderId =
        paymentEntity?.order_id ?? null;

      if (rzpOrderId) {
        const { data: order } = await supabase
          .from('orders')
          .select('id')
          .eq('razorpay_order_id', rzpOrderId)
          .maybeSingle();

        if (order) {
          await supabase
            .from('orders')
            .update({
              payment_status: 'failed',
            })
            .eq('id', order.id);
        }
      }
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
