import { createClient, createServiceClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';
import type { Order } from '@/types';

export async function getUserOrders(userId: string): Promise<Order[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[orders] user orders failed', error);
    return [];
  }
  return (data ?? []) as unknown as Order[];
}

export async function getOrderById(id: string): Promise<Order | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) return null;
  return (data as unknown as Order) ?? null;
}

export const getAdminStats = unstable_cache(
  async () => {
    const supabase = createServiceClient();
    const [revenue, orders, customers, products] = await Promise.all([
      supabase.from('orders').select('total').eq('payment_status', 'paid'),
      supabase.from('orders').select('id, order_status, created_at'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id, stock_count, in_stock', { count: 'exact' }),
    ]);
    const totalRevenue = (revenue.data ?? []).reduce((a, o) => a + Number(o.total ?? 0), 0);
    return {
      totalRevenue,
      totalOrders: orders.data?.length ?? 0,
      totalCustomers: customers.count ?? 0,
      totalProducts: products.count ?? 0,
      outOfStock: (products.data ?? []).filter((p) => !p.in_stock).length,
      lowStock: (products.data ?? []).filter((p) => (p.stock_count ?? 0) > 0 && (p.stock_count ?? 0) <= 5).length,
    };
  },
  ['admin-stats'],
  { revalidate: 60, tags: ['orders', 'products', 'profiles'] }
);
