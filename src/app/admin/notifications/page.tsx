import { Bell } from 'lucide-react';
import { AdminPageHeader, AdminSection, EmptyState, MetricCard, StatusBadge } from '../_components/ui';
import { getNotificationsPageData } from '@/server/admin-modules';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notifications · Admin' };

export default async function NotificationsPage() {
  await requireAdminPermission('notifications.read');
  const { notifications } = await getNotificationsPageData();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdminPageHeader title="Notifications" description="Admin and customer notification records for operational events." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Notifications" value={notifications.length.toLocaleString('en-IN')} icon={Bell} tone="blue" />
        <MetricCard label="Unread" value={notifications.filter((n) => !n.read_at).length.toLocaleString('en-IN')} icon={Bell} tone="amber" />
        <MetricCard label="Admin audience" value={notifications.filter((n) => n.audience === 'admin').length.toLocaleString('en-IN')} icon={Bell} tone="gold" />
      </div>
      <AdminSection title="Notification log">
        {notifications.length ? (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div key={notification.id} className="rounded-lg border border-stone-100 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold">{notification.title}</p>
                  <StatusBadge value={notification.type} tone="blue" />
                </div>
                {notification.body ? <p className="mt-1 text-sm text-neutral-600">{notification.body}</p> : null}
                <p className="mt-2 text-xs text-neutral-500">{notification.audience} · {formatDateTime(notification.created_at)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No notifications yet" description="Payment, order, stock and customer events will create notifications here." />
        )}
      </AdminSection>
    </div>
  );
}
