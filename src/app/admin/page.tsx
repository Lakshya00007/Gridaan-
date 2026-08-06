import { getDashboardData, type DashboardRange } from '@/server/admin';
import { requireAdminPagePermission } from '@/lib/admin/permissions';
import AdminDashboard from './_dashboard';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Admin Dashboard' };

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdminPagePermission('dashboard.read');
  const requestedRange = (await searchParams).range;
  const range: DashboardRange = requestedRange === '24h' || requestedRange === '7d' ? requestedRange : '30d';
  const data = await getDashboardData(range);

  return <AdminDashboard data={data} />;
}
