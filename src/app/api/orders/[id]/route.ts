import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/auth';
import { errorResponse, unauthorized, notFound } from '@/lib/api';
import type { OrderSuccessSummary } from '@/types';

const ORDER_SUCCESS_SELECT =
  'id, order_number, customer_name, total, payment_method, payment_status, order_status, razorpay_order_id, created_at';

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** GET /api/orders/:id -> fetch an authenticated order by UUID or a public order summary by order number. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: identifier } = await params;
    console.info('[orders/:id] lookup request', { identifier });

    if (!identifier) throw notFound('Order identifier is required');

    if (!isUuid(identifier)) {
      const serviceSupabase = createServiceClient();
      const { data, error } = await serviceSupabase
        .from('orders')
        .select(ORDER_SUCCESS_SELECT)
        .eq('order_number', identifier)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw notFound('Order not found');
      const order = data as OrderSuccessSummary;

      console.info('[orders/:id] public summary response', {
        identifier,
        orderNumber: order.order_number,
        paymentStatus: order.payment_status,
        orderStatus: order.order_status,
      });

      return NextResponse.json({ order });
    }

    const user = await getUser();
    if (!user) throw unauthorized();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', identifier)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw notFound('Order not found');

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (data.user_id !== user.id && !profile?.is_admin) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    console.info('[orders/:id] authenticated response', {
      identifier,
      orderNumber: data.order_number,
      paymentStatus: data.payment_status,
      orderStatus: data.order_status,
    });

    return NextResponse.json({ order: data });
  } catch (err) {
    return errorResponse(err);
  }
}
