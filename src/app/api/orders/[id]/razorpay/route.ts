import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { assertSameOrigin, badRequest, errorResponse, notFound } from '@/lib/api';
import { createRzpOrder } from '@/lib/razorpay';
import { publicEnv } from '@/lib/env.public';
import { getClientIdentifier, isRateLimited } from '@/lib/rate-limit';
import type { OrderSuccessSummary } from '@/types';

type RazorpayRetryOrderRow = OrderSuccessSummary & {
  customer_email: string | null;
  customer_phone: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const RAZORPAY_ORDER_SELECT =
  'id, order_number, customer_name, customer_email, customer_phone, total, payment_method, payment_status, order_status, razorpay_order_id, created_at';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const clientId = getClientIdentifier(req);
  if (isRateLimited(clientId, { limit: 8, windowSec: 60 })) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    assertSameOrigin(req);
    const { id: identifier } = await params;
    const supabase = createServiceClient();
    console.info('[orders/:id/razorpay] init request', { identifier });

    let query = supabase.from('orders').select(RAZORPAY_ORDER_SELECT);
    query = isUuid(identifier) ? query.eq('id', identifier) : query.eq('order_number', identifier);
    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    if (!data) throw notFound('Order not found');
    const order = data as RazorpayRetryOrderRow;
    if (order.payment_method !== 'razorpay') {
      throw badRequest('This order does not use online payment', 'invalid_payment_method');
    }
    if (order.payment_status === 'paid') {
      throw badRequest('This order is already paid', 'already_paid');
    }

    let razorpayOrderId = order.razorpay_order_id;
    const amount = Math.round(Number(order.total) * 100);
    const currency = 'INR';

    if (!razorpayOrderId || order.payment_status === 'failed') {
      const rzpOrder = await createRzpOrder({
        amount,
        receipt: order.order_number,
        notes: { order_id: order.id },
      });

      razorpayOrderId = rzpOrder.id;
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'pending',
          razorpay_order_id: razorpayOrderId,
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      console.info('[orders/:id/razorpay] created Razorpay order', {
        identifier,
        orderNumber: order.order_number,
        razorpayOrderId,
        amount,
      });
    } else {
      console.info('[orders/:id/razorpay] reusing pending Razorpay order', {
        identifier,
        orderNumber: order.order_number,
        razorpayOrderId,
      });
    }

    return NextResponse.json({
      order: {
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        total: order.total,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        order_status: order.order_status,
        razorpay_order_id: razorpayOrderId,
        created_at: order.created_at,
      },
      rzp_order: {
        id: razorpayOrderId,
        amount,
        currency,
      },
      rzp_key: publicEnv.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
