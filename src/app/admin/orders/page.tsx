import OrdersAdmin from './_client';
import { createClient } from '@/lib/supabase/server';
import type { Order } from '@/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Orders · Admin' };

export default async function Page() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .order('created_at', { ascending: false })
    .range(0, 199);
  return <OrdersAdmin orders={(orders ?? []) as Order[]} />;
}
