import { getDashboardData } from '@/server/admin';
import { requireAdminPermission } from '@/lib/admin/permissions';
import AdminDashboardClient from './_dashboard';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Admin Dashboard' };

export default async function AdminHome() {
  await requireAdminPermission('dashboard.read');
  const data = await getDashboardData();

  return <AdminDashboardClient data={data} />;
}
