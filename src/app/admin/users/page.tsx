import { UserCog } from 'lucide-react';
import { AdminPageHeader, AdminSection, EmptyState, MetricCard, StatusBadge } from '../_components/ui';
import { getAdminUsersPageData } from '@/server/admin-modules';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin Users & Roles · Admin' };

export default async function AdminUsersPage() {
  await requireAdminPermission('admin_users.read');
  const { users } = await getAdminUsersPageData();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdminPageHeader title="Admin Users & Roles" description="Role-based access for owner, admin, operations, inventory manager, support, analyst and viewer." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Admin users" value={users.length.toLocaleString('en-IN')} icon={UserCog} tone="blue" />
        <MetricCard label="Active" value={users.filter((u) => u.is_active).length.toLocaleString('en-IN')} icon={UserCog} tone="green" />
        <MetricCard label="Owners" value={users.filter((u) => u.role === 'owner').length.toLocaleString('en-IN')} icon={UserCog} tone="gold" />
      </div>
      <AdminSection title="Role assignments">
        {users.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left">
              <thead>
                <tr className="border-b border-stone-100 text-xs text-neutral-500">
                  <th className="py-3 pr-4 font-semibold">Admin</th>
                  <th className="py-3 pr-4 font-semibold">Role</th>
                  <th className="py-3 pr-4 font-semibold">Extra permissions</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id} className="border-b border-stone-50 text-sm">
                    <td className="py-3 pr-4">
                      <p className="font-semibold">{user.profile?.full_name ?? 'Admin'}</p>
                      <p className="text-xs text-neutral-500">{user.profile?.email ?? user.user_id}</p>
                    </td>
                    <td className="py-3 pr-4"><StatusBadge value={user.role} tone="gold" /></td>
                    <td className="py-3 pr-4">{user.permissions.length ? user.permissions.join(', ') : 'Role default'}</td>
                    <td className="py-3 pr-4"><StatusBadge value={user.is_active ? 'active' : 'inactive'} tone={user.is_active ? 'green' : 'neutral'} /></td>
                    <td className="py-3 pr-4 text-xs text-neutral-500">{formatDateTime(user.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No role assignments yet" description="Existing boolean admins still work; role assignments appear after admin_profiles is populated." />
        )}
      </AdminSection>
    </div>
  );
}
