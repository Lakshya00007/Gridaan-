import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/auth';
import { errorResponse, unauthorized } from '@/lib/api';

/** GET /api/orders/mine  -> current user's orders. */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) throw unauthorized();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ orders: data ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}
