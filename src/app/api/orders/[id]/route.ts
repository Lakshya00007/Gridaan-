import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireVerifiedCustomer } from '@/lib/auth/customer';
import { errorResponse, notFound } from '@/lib/api';

const ORDER_SUMMARY_SELECT =
  'id, order_number, customer_name, total, payment_method, payment_status, order_status, created_at';

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Only the verified owner can read an order, including by order number. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireVerifiedCustomer();
    const { id: identifier } = await params;
    if (!identifier || identifier.length > 100) throw notFound('Order not found');
    const column = isUuid(identifier) ? 'id' : 'order_number';
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SUMMARY_SELECT)
      .eq(column, identifier)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    // Older guest orders predate mandatory login. Their verified email owner
    // may still follow an existing confirmation link.
    let order = data;
    if (!order) {
      const legacy = await supabase.from('orders').select(ORDER_SUMMARY_SELECT)
        .eq(column, identifier).is('user_id', null).eq('customer_email', user.email).maybeSingle();
      if (legacy.error) throw legacy.error;
      order = legacy.data;
    }
    if (!order) throw notFound('Order not found');
    return NextResponse.json({ order }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
