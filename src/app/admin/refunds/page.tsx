import { CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import { AdminPageHeader, AdminSection, EmptyState, MetricCard, StatusBadge } from '../_components/ui';
import { listRefundsForAdmin } from '@/server/admin';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { formatDateTime, formatRupees } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Refunds · Admin' };

export default async function RefundsPage() {
  await requireAdminPermission('refunds.read');
  const refunds = await listRefundsForAdmin();
  const pending = refunds.filter((refund) => refund.status === 'requested' || refund.status === 'processing');
  const processed = refunds.filter((refund) => refund.status === 'processed');

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdminPageHeader
        title="Refunds"
        description="Review full and partial refunds. The backend prevents duplicate processing and refunds above captured payment value."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Refund records" value={refunds.length.toLocaleString('en-IN')} icon={RotateCcw} tone="blue" />
        <MetricCard label="Pending" value={pending.length.toLocaleString('en-IN')} icon={Clock} tone="amber" />
        <MetricCard label="Processed" value={processed.length.toLocaleString('en-IN')} icon={CheckCircle2} tone="green" />
      </div>
      <AdminSection title="Refund queue">
        {refunds.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] text-left">
              <thead>
                <tr className="border-b border-stone-100 text-xs text-neutral-500">
                  <th className="py-3 pr-4 font-semibold">Refund ID</th>
                  <th className="py-3 pr-4 font-semibold">Order</th>
                  <th className="py-3 pr-4 font-semibold">Payment</th>
                  <th className="py-3 pr-4 font-semibold">Requested</th>
                  <th className="py-3 pr-4 font-semibold">Approved</th>
                  <th className="py-3 pr-4 font-semibold">Reason</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Gateway refund</th>
                  <th className="py-3 pr-4 font-semibold">Created</th>
                  <th className="py-3 pr-4 font-semibold">Processed</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund) => (
                  <tr key={refund.id} className="border-b border-stone-50 text-sm">
                    <td className="py-3 pr-4 font-mono text-xs">{refund.id.slice(0, 8)}</td>
                    <td className="py-3 pr-4 font-semibold">{refund.order?.order_number ?? refund.order_id.slice(0, 8)}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{refund.payment?.gateway_payment_id ?? refund.payment_id?.slice(0, 8) ?? '—'}</td>
                    <td className="py-3 pr-4">{formatRupees(refund.requested_amount_paise / 100)}</td>
                    <td className="py-3 pr-4">{refund.approved_amount_paise ? formatRupees(refund.approved_amount_paise / 100) : '—'}</td>
                    <td className="py-3 pr-4">{refund.reason}</td>
                    <td className="py-3 pr-4"><StatusBadge value={refund.status} tone={refund.status === 'failed' || refund.status === 'rejected' ? 'red' : refund.status === 'processed' ? 'green' : 'amber'} /></td>
                    <td className="py-3 pr-4 font-mono text-xs">{refund.gateway_refund_id ?? 'integration pending'}</td>
                    <td className="py-3 pr-4 text-xs text-neutral-500">{formatDateTime(refund.created_at)}</td>
                    <td className="py-3 pr-4 text-xs text-neutral-500">{refund.processed_at ? formatDateTime(refund.processed_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No refunds yet" description="Refund requests and placeholder Razorpay refunds will appear here." />
        )}
      </AdminSection>
    </div>
  );
}
