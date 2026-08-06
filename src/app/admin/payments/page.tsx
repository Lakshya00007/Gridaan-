import Link from 'next/link';
import { AlertTriangle, CreditCard, IndianRupee, RefreshCcw } from 'lucide-react';
import { AdminPageHeader, AdminSection, EmptyState, MetricCard, StatusBadge } from '../_components/ui';
import { listPaymentAttemptsForAdmin, listPaymentsForAdmin } from '@/server/admin';
import { requireAdminPagePermission } from '@/lib/admin/permissions';
import { formatDateTime, formatRupees } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Payments · Admin' };

export default async function PaymentsPage() {
  await requireAdminPagePermission('payments.read');
  const [payments, attempts] = await Promise.all([listPaymentsForAdmin(), listPaymentAttemptsForAdmin()]);
  const captured = payments.filter((payment) => payment.captured);
  const refundPaise = payments.reduce((sum, payment) => sum + (payment.refund_amount_paise ?? 0), 0);
  const failedAttempts = attempts.filter((attempt) => attempt.status === 'failed');
  const abandonedAttempts = attempts.filter((attempt) => attempt.error_code === 'checkout_dismissed');

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdminPageHeader
        title="Payments"
        description="Track internal payment IDs, gateway identifiers, amount, method, status, captures, refunds, webhook records and audit history."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Payments" value={payments.length.toLocaleString('en-IN')} icon={CreditCard} tone="blue" />
        <MetricCard label="Captured" value={captured.length.toLocaleString('en-IN')} icon={IndianRupee} tone="green" />
        <MetricCard label="Refund amount" value={formatRupees(refundPaise / 100)} icon={RefreshCcw} tone="red" />
        <MetricCard label="Failed attempts" value={failedAttempts.length.toLocaleString('en-IN')} icon={AlertTriangle} tone="red" />
        <MetricCard label="Abandoned attempts" value={abandonedAttempts.length.toLocaleString('en-IN')} icon={AlertTriangle} tone="amber" />
      </div>
      <AdminSection title="Payment records">
        {payments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[72rem] text-left">
              <thead>
                <tr className="border-b border-stone-100 text-xs text-neutral-500">
                  <th className="py-3 pr-4 font-semibold">Internal ID</th>
                  <th className="py-3 pr-4 font-semibold">Order</th>
                  <th className="py-3 pr-4 font-semibold">Customer</th>
                  <th className="py-3 pr-4 font-semibold">Gateway</th>
                  <th className="py-3 pr-4 font-semibold">Gateway order</th>
                  <th className="py-3 pr-4 font-semibold">Gateway payment</th>
                  <th className="py-3 pr-4 font-semibold">Amount</th>
                  <th className="py-3 pr-4 font-semibold">Method</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Captured</th>
                  <th className="py-3 pr-4 font-semibold">Refunded</th>
                  <th className="py-3 pr-4 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-stone-50 text-sm">
                    <td className="py-3 pr-4 font-mono text-xs">
                      <Link href={`/admin/payments/${payment.id}`} className="hover:text-gold-700">{payment.id.slice(0, 8)}</Link>
                    </td>
                    <td className="py-3 pr-4 font-semibold">
                      <Link href={`/admin/orders/${payment.order_id}`} className="hover:text-gold-700">
                        {payment.order?.order_number ?? payment.order_id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{payment.order?.customer_name ?? '—'}</td>
                    <td className="py-3 pr-4">{payment.gateway}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{payment.gateway_order_id ?? 'integration pending'}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{payment.gateway_payment_id ?? '—'}</td>
                    <td className="py-3 pr-4 font-semibold">{formatRupees(payment.amount_paise / 100)} {payment.currency}</td>
                    <td className="py-3 pr-4">{payment.method ?? '—'}</td>
                    <td className="py-3 pr-4"><StatusBadge value={payment.status} tone={payment.status === 'failed' ? 'red' : payment.captured ? 'green' : 'amber'} /></td>
                    <td className="py-3 pr-4">{payment.captured ? 'Yes' : 'No'}</td>
                    <td className="py-3 pr-4">{formatRupees((payment.refund_amount_paise ?? 0) / 100)}</td>
                    <td className="py-3 pr-4 text-xs text-neutral-500">{formatDateTime(payment.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No payment records yet" description="Verified Razorpay payment records will appear here." />
        )}
      </AdminSection>
      <div className="mt-6">
        <AdminSection title="Payment attempts" description="Attempts are tracked separately from placed orders. Failed and abandoned attempts never create order numbers.">
          {attempts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[62rem] text-left">
                <thead>
                  <tr className="border-b border-stone-100 text-xs text-neutral-500">
                    <th className="py-3 pr-4 font-semibold">Attempt</th>
                    <th className="py-3 pr-4 font-semibold">Checkout</th>
                    <th className="py-3 pr-4 font-semibold">Customer</th>
                    <th className="py-3 pr-4 font-semibold">Gateway order</th>
                    <th className="py-3 pr-4 font-semibold">Amount</th>
                    <th className="py-3 pr-4 font-semibold">Status</th>
                    <th className="py-3 pr-4 font-semibold">Failure</th>
                    <th className="py-3 pr-4 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt) => (
                    <tr key={attempt.id} className="border-b border-stone-50 text-sm">
                      <td className="py-3 pr-4 font-mono text-xs">{attempt.id.slice(0, 8)}</td>
                      <td className="py-3 pr-4 font-semibold">
                        {attempt.order_id ? (
                          <Link href={`/admin/orders/${attempt.order_id}`} className="hover:text-gold-700">
                            {attempt.order?.order_number ?? attempt.order?.checkout_reference ?? attempt.order_id.slice(0, 8)}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="py-3 pr-4">{attempt.order?.customer_name ?? 'Guest checkout'}</td>
                      <td className="py-3 pr-4 font-mono text-xs">{attempt.gateway_order_id ?? '—'}</td>
                      <td className="py-3 pr-4 font-semibold">{formatRupees(attempt.amount_paise / 100)} {attempt.currency}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge value={attempt.status} tone={attempt.status === 'failed' ? 'red' : attempt.status === 'captured' ? 'green' : 'amber'} />
                      </td>
                      <td className="py-3 pr-4 text-xs text-neutral-500">
                        {attempt.error_code === 'checkout_dismissed' ? 'abandoned checkout' : attempt.error_message ?? '—'}
                      </td>
                      <td className="py-3 pr-4 text-xs text-neutral-500">{formatDateTime(attempt.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No payment attempts yet" description="Razorpay checkout attempts will appear here." />
          )}
        </AdminSection>
      </div>
    </div>
  );
}
