import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/auth';
import { errorResponse, unauthorized, notFound } from '@/lib/api';

/** GET /api/orders/:id -> fetch a single order. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) throw unauthorized();
    const { id } = await params;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound('Order not found');
    // Either the owner or admin
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (data.user_id !== user.id && !profile?.is_admin) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.json({ order: data });
  } catch (err) {
    return errorResponse(err);
  }
}
