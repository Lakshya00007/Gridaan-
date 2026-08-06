import { FileClock } from 'lucide-react';
import { AdminPageHeader, AdminSection, EmptyState, MetricCard, StatusBadge } from '../_components/ui';
import { getAuditPageData } from '@/server/admin-modules';
import { requireAdminPagePermission } from '@/lib/admin/permissions';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Audit Logs · Admin' };

export default async function AuditLogsPage() {
  await requireAdminPagePermission('audit_logs.read');
  const { logs } = await getAuditPageData();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdminPageHeader title="Audit Logs" description="Immutable-style records for product, stock, order, refund, coupon, loyalty, role and settings changes." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Audit records" value={logs.length.toLocaleString('en-IN')} icon={FileClock} tone="blue" />
        <MetricCard label="Entities" value={new Set(logs.map((log) => log.entity)).size.toLocaleString('en-IN')} icon={FileClock} tone="gold" />
        <MetricCard label="Recent actions" value={logs.slice(0, 24).length.toLocaleString('en-IN')} icon={FileClock} tone="green" />
      </div>
      <AdminSection title="Activity">
        {logs.length ? (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="rounded-lg border border-stone-100 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold">{log.action}</p>
                  <StatusBadge value={log.entity} tone="neutral" />
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {log.entity_id ?? 'No entity id'} · {formatDateTime(log.created_at)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No audit logs yet" description="Audit records will appear after admin mutations use the new audit helper." />
        )}
      </AdminSection>
    </div>
  );
}
