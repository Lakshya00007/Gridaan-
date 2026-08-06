import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { CreditCard, FileDown, IndianRupee, MessageCircle, PackageCheck, Printer, RefreshCcw, Truck } from 'lucide-react';
import { AdminPageHeader, AdminSection, EmptyState, MetricCard, StatusBadge } from '../../_components/ui';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { formatPaymentMethod } from '@/lib/manual-payment';
import { buildCustomerOrderLink, buildStatusUpdateLink } from '@/lib/whatsapp-links';
import { getAdminOrderDetail } from '@/server/admin';
import { cn, formatDateTime, formatRupees } from '@/lib/utils';
import type { OrderAddress, OrderItem, PaymentRecord, RefundRecord } from '@/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Order Detail · Admin' };

const paramsSchema = z.object({ id: z.string().uuid() });

type ExtendedOrderItem = OrderItem & {
  sku?: string | null;
  product_snapshot?: Record<string, unknown> | null;
  discount_amount?: number | null;
  tax?: number | null;
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPermission('orders.read');
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) notFound();

  const detail = await getAdminOrderDetail(parsed.data.id);
  if (!detail) notFound();

  const { order, payments, refunds, statusHistory, auditLogs } = detail;
  const totalItems = (order.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
  const capturedPayment = payments.find((payment) => payment.captured);
  const refundTotalPaise = refunds.reduce((sum, refund) => sum + (refund.approved_amount_paise ?? 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdminPageHeader
        title={order.order_number ?? order.checkout_reference ?? order.id.slice(0, 8)}
        description="Complete order record with customer, address, line items, payment, shipment, refund and audit context."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/orders"
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-stone-50"
            >
              Back to orders
            </Link>
            <a
              href={buildCustomerOrderLink(order)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              <MessageCircle className="h-4 w-4" />
              Contact customer
            </a>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Final amount" value={formatRupees(order.final_amount ?? order.total)} icon={IndianRupee} tone="gold" />
        <MetricCard label="Items" value={totalItems.toLocaleString('en-IN')} icon={PackageCheck} tone="blue" />
        <MetricCard label="Captured payment" value={capturedPayment ? 'Yes' : 'No'} icon={CreditCard} tone={capturedPayment ? 'green' : 'amber'} />
        <MetricCard label="Refunded" value={formatRupees(refundTotalPaise / 100)} icon={RefreshCcw} tone={refundTotalPaise > 0 ? 'red' : 'neutral'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
        <div className="space-y-6">
          <AdminSection title="Product line items" description="Prices are stored as order-time snapshots. Browser-submitted prices are not trusted.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[54rem] text-left">
                <thead>
                  <tr className="border-b border-stone-100 text-xs text-neutral-500">
                    <th className="py-3 pr-4 font-semibold">Product</th>
                    <th className="py-3 pr-4 font-semibold">SKU</th>
                    <th className="py-3 pr-4 font-semibold">Snapshot</th>
                    <th className="py-3 pr-4 font-semibold">Qty</th>
                    <th className="py-3 pr-4 font-semibold">Unit</th>
                    <th className="py-3 pr-4 font-semibold">Discount</th>
                    <th className="py-3 pr-4 font-semibold">Tax</th>
                    <th className="py-3 pr-4 font-semibold">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items ?? []).map((item) => {
                    const row = item as ExtendedOrderItem;
                    return (
                      <tr key={item.id} className="border-b border-stone-50 text-sm">
                        <td className="py-3 pr-4 font-semibold text-neutral-950">{item.product_name}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-neutral-500">{row.sku ?? item.product_id.slice(0, 8)}</td>
                        <td className="py-3 pr-4 text-xs text-neutral-500">
                          {row.product_snapshot ? 'Stored' : 'Legacy item'}
                        </td>
                        <td className="py-3 pr-4">{item.quantity}</td>
                        <td className="py-3 pr-4">{formatRupees(item.unit_price)}</td>
                        <td className="py-3 pr-4 text-emerald-700">
                          {row.discount_amount ? `-${formatRupees(row.discount_amount)}` : 'None'}
                        </td>
                        <td className="py-3 pr-4">{row.tax ? formatRupees(row.tax) : 'None'}</td>
                        <td className="py-3 pr-4 font-semibold">{formatRupees(item.line_total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </AdminSection>

          <AdminSection title="Payment details">
            {payments.length ? (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <PaymentRow key={payment.id} payment={payment} />
                ))}
              </div>
            ) : (
              <EmptyState title="No payment record" description="A payment row will be created when the new payment-order API is used." />
            )}
          </AdminSection>

          <AdminSection title="Status timeline">
            {statusHistory.length ? (
              <ol className="space-y-3">
                {statusHistory.map((entry) => (
                  <li key={entry.id} className="rounded-xl border border-stone-100 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StatusBadge value={entry.to_status} tone="blue" />
                      <span className="text-xs text-neutral-500">{formatDateTime(entry.created_at)}</span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500">
                      {entry.from_status ? `${entry.from_status.replace(/_/g, ' ')} to ` : ''}
                      {entry.to_status.replace(/_/g, ' ')}
                    </p>
                    {entry.note ? <p className="mt-1 text-sm text-neutral-700">{entry.note}</p> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState title="No timeline entries" description="Status changes will appear here as the order is processed." />
            )}
          </AdminSection>

          <AdminSection title="Audit history">
            {auditLogs.length ? (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-stone-100 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-neutral-950">{log.action}</p>
                      <span className="text-xs text-neutral-500">{formatDateTime(log.created_at)}</span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">Entity: {log.entity}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No audit entries" description="Authorised admin changes will be written to the audit log." />
            )}
          </AdminSection>
        </div>

        <aside className="space-y-6">
          <AdminSection title="Current state">
            <div className="space-y-3 text-sm">
              <DetailLine label="Order status" value={<StatusBadge value={order.order_status} tone={order.order_status === 'cancelled' ? 'red' : 'gold'} />} />
              <DetailLine label="Payment status" value={<StatusBadge value={order.payment_status} tone={order.payment_status === 'failed' ? 'red' : order.payment_status === 'captured' ? 'green' : 'amber'} />} />
              <DetailLine label="Fulfilment" value={order.fulfilment_status ?? 'unfulfilled'} />
              <DetailLine label="Method" value={formatPaymentMethod(order.payment_method)} />
              <DetailLine label="Created" value={formatDateTime(order.created_at)} />
              <DetailLine label="Classification" value={order.data_classification ?? (order.is_test ? 'test' : 'genuine')} />
            </div>
          </AdminSection>

          <AdminSection title="Customer">
            <div className="space-y-2 text-sm">
              <DetailLine label="Name" value={order.customer_name} />
              <DetailLine label="Phone" value={order.customer_phone} />
              <DetailLine label="Email" value={order.customer_email ?? 'Not provided'} />
              <DetailLine label="Customer ID" value={order.user_id ? order.user_id.slice(0, 8) : 'Guest'} />
            </div>
          </AdminSection>

          <AdminSection title="Addresses">
            <div className="space-y-4">
              <AddressBlock title="Shipping" address={order.shipping_address} />
              <AddressBlock title="Billing" address={order.billing_address ?? order.shipping_address} />
            </div>
          </AdminSection>

          <AdminSection title="Totals">
            <div className="space-y-2 text-sm">
              <DetailLine label="Gross" value={formatRupees(order.gross_amount ?? order.subtotal + order.discount)} />
              <DetailLine label="Discount" value={order.discount > 0 ? `-${formatRupees(order.discount)}` : 'None'} />
              <DetailLine label="Shipping" value={order.shipping === 0 ? 'Free' : formatRupees(order.shipping)} />
              <DetailLine label="Tax" value={formatRupees(order.tax)} />
              <div className="border-t border-stone-100 pt-2">
                <DetailLine label="Final total" value={formatRupees(order.final_amount ?? order.total)} strong />
              </div>
            </div>
          </AdminSection>

          <AdminSection title="Shipment">
            <div className="space-y-2 text-sm">
              <DetailLine label="Carrier" value={order.shipment_carrier ?? 'Not added'} />
              <DetailLine label="Tracking" value={order.shipment_tracking_number ?? 'Not added'} />
              <DetailLine label="Shipped" value={order.shipped_at ? formatDateTime(order.shipped_at) : 'Not shipped'} />
              <DetailLine label="Delivered" value={order.delivered_at ? formatDateTime(order.delivered_at) : 'Not delivered'} />
            </div>
          </AdminSection>

          <AdminSection title="Notes">
            <NoteBlock label="Customer note" value={order.customer_notes ?? order.notes} />
            <NoteBlock label="Internal note" value={order.internal_notes} />
          </AdminSection>

          <AdminSection title="Admin actions">
            <div className="grid gap-2">
              <a
                href={buildStatusUpdateLink(order, order.order_status)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold-100 px-3 py-2 text-sm font-semibold text-gold-800 hover:bg-gold-200"
              >
                <MessageCircle className="h-4 w-4" />
                Send status update
              </a>
              <button type="button" disabled className={disabledActionClass}>
                <Truck className="h-4 w-4" />
                Add tracking number
              </button>
              <button type="button" disabled className={disabledActionClass}>
                <RefreshCcw className="h-4 w-4" />
                Initiate refund
              </button>
              <button type="button" disabled className={disabledActionClass}>
                <Printer className="h-4 w-4" />
                Print invoice
              </button>
              <button type="button" disabled className={disabledActionClass}>
                <FileDown className="h-4 w-4" />
                Download invoice
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-neutral-500">
              Status changes with confirmation are available from the orders table drawer. Tracking, invoice and refund write flows are scaffolded for the next server actions.
            </p>
          </AdminSection>

          <AdminSection title="Refund information">
            {refunds.length ? (
              <div className="space-y-3">
                {refunds.map((refund) => (
                  <RefundRow key={refund.id} refund={refund} />
                ))}
              </div>
            ) : (
              <EmptyState title="No refunds" description="Approved full or partial refunds will appear here." />
            )}
          </AdminSection>
        </aside>
      </div>
    </div>
  );
}

const disabledActionClass =
  'inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-neutral-400';

function PaymentRow({ payment }: { payment: PaymentRecord }) {
  return (
    <div className="rounded-xl border border-stone-100 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/admin/payments/${payment.id}`} className="font-mono text-xs font-semibold text-neutral-950 hover:text-gold-700">
          {payment.id}
        </Link>
        <StatusBadge value={payment.status} tone={payment.captured ? 'green' : payment.status === 'failed' ? 'red' : 'amber'} />
      </div>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <DetailLine label="Gateway" value={payment.gateway} />
        <DetailLine label="Amount" value={`${formatRupees(payment.amount_paise / 100)} ${payment.currency}`} />
        <DetailLine label="Gateway order ID" value={payment.gateway_order_id ?? 'integration pending'} />
        <DetailLine label="Gateway payment ID" value={payment.gateway_payment_id ?? 'Not received'} />
        <DetailLine label="Method" value={payment.method ?? 'Not known'} />
        <DetailLine label="Captured" value={payment.captured ? 'Yes' : 'No'} />
        {payment.failure_reason ? <DetailLine label="Failure" value={payment.failure_reason} /> : null}
      </div>
    </div>
  );
}

function RefundRow({ refund }: { refund: RefundRecord }) {
  return (
    <div className="rounded-xl border border-stone-100 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs font-semibold">{refund.id.slice(0, 8)}</p>
        <StatusBadge value={refund.status} tone={refund.status === 'failed' || refund.status === 'rejected' ? 'red' : refund.status === 'processed' ? 'green' : 'amber'} />
      </div>
      <div className="mt-2 space-y-1">
        <DetailLine label="Requested" value={formatRupees(refund.requested_amount_paise / 100)} />
        <DetailLine label="Approved" value={refund.approved_amount_paise ? formatRupees(refund.approved_amount_paise / 100) : 'Pending'} />
        <DetailLine label="Reason" value={refund.reason} />
        <DetailLine label="Gateway refund" value={refund.gateway_refund_id ?? 'integration pending'} />
      </div>
    </div>
  );
}

function AddressBlock({ title, address }: { title: string; address: OrderAddress }) {
  return (
    <div className="rounded-xl border border-stone-100 p-3">
      <p className="mb-2 text-xs font-bold uppercase text-neutral-400">{title}</p>
      <p className="text-sm font-semibold text-neutral-950">{address.full_name}</p>
      <p className="text-xs text-neutral-500">{address.phone}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-700">
        {address.line1}
        {address.line2 ? `, ${address.line2}` : ''}
        <br />
        {address.city}, {address.state} - {address.pincode}
        <br />
        {address.country}
      </p>
    </div>
  );
}

function NoteBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-xs font-semibold text-neutral-500">{label}</p>
      <p className={cn('mt-1 rounded-lg border border-stone-100 p-3 text-sm leading-6', value ? 'text-neutral-700' : 'text-neutral-400')}>
        {value || 'No note added'}
      </p>
    </div>
  );
}

function DetailLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-neutral-500">{label}</span>
      <span className={cn('text-right text-neutral-900', strong && 'font-bold')}>{value}</span>
    </div>
  );
}
