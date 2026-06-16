import { getAdminStats } from '@/server/orders';
import { createClient } from '@/lib/supabase/server';
import AdminDashboardClient from './_dashboard';
import type { Order } from '@/types';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Admin Dashboard' };

export default async function AdminHome() {
  const stats = await getAdminStats();
  const supabase = await createClient();
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <AdminDashboardClient
      stats={{
        totalRevenue: stats.totalRevenue,
        totalOrders: stats.totalOrders,
        totalCustomers: stats.totalCustomers,
        totalProducts: stats.totalProducts,
        outOfStock: stats.outOfStock,
        lowStock: stats.lowStock,
      }}
      recentOrders={(recentOrders ?? []) as Order[]}
    />
  );
}
