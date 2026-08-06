import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { AlertTriangle, CreditCard, IndianRupee, RefreshCcw, ShieldCheck, Webhook } from 'lucide-react';
import { AdminPageHeader, AdminSection, EmptyState, MetricCard, StatusBadge } from '../../_components/ui';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { getAdminPaymentDetail } from '@/server/admin';
import { formatDateTime, formatRupees } from '@/lib/utils';
import type { RefundRecord } from '@/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Payment Detail · Admin' };

const paramsSchema = z.object({ paymentId: z.string().uuid() });

export default async function AdminPaymentDetailPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  await requireAdminPermission('payments.read');
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) notFound();

  const detail = await getAdminPaymentDetail(parsed.data.paymentId);
  if (!detail) notFound();

  const { payment, attempts, refunds, webhookEvents, auditLogs } = detail;
  const refundablePaise = Math.max(0, payment.amount_paise - (payment.refund_amount_paise ?? 0));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdminPageHeader
        title={`Payment ${payment.id.slice(0, 8)}`}
        description="Internal payment record with gateway placeholders, attempts, refund records, webhook events and audit history."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/payments"
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-stone-50"
            >
              Back to payments
            </Link>
            {payment.order ? (
              <Link
                href={`/admin/orders/${payment.order_id}`}
                className="rounded-lg bg-neutral-950 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                View order
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Amount" value={`${formatRupees(payment.amount_paise / 100)} ${payment.currency}`} icon={IndianRupee} tone="gold" />
        <MetricCard label="Status" value={payment.status.replace(/_/g, ' ')} icon={CreditCard} tone={payment.captured ? 'green' : payment.status === 'failed' ? 'red' : 'amber'} />
        <MetricCard label="Refundable" value={formatRupees(refundablePaise / 100)} icon={RefreshCcw} tone={refundablePaise > 0 ? 'blue' : 'neutral'} />
        <MetricCard label="Webhook events" value={webhookEvents.length.toLocaleString('en-IN')} icon={Webhook} tone="blue" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
        <div className="space-y-6">
          <AdminSection title="Payment timeline" description="Frontend verification never marks an order paid by itself; webhook confirmation is the source of capture truth.">
            <ol className="space-y-3">
              <TimelineItem
                title="Internal payment created"
                date={payment.created_at}
                tone="blue"
                body={`Provider ${payment.provider}; gateway ${payment.gateway}.`}
              />
              {attempts.map((attempt) => (
                <TimelineItem
                  key={attempt.id}
                  title={`Attempt ${attempt.status.replace(/_/g, ' ')}`}
                  date={attempt.created_at}
                  tone={attempt.error_message ? 'red' : 'amber'}
                  body={`Gateway order ${attempt.gateway_order_id ?? 'integration pending'}; idempotency ${attempt.idempotency_key}.`}
                />
              ))}
              {payment.captured_at ? (
                <TimelineItem title="Payment captured" date={payment.captured_at} tone="green" body="Order can move into paid fulfilment state after webhook confirmation." />
              ) : null}
              {refunds.map((refund) => (
                <TimelineItem
                  key={refund.id}
                  title={`Refund ${refund.status.replace(/_/g, ' ')}`}
                  date={refund.processed_at ?? refund.approved_at ?? refund.created_at}
                  tone={refund.status === 'failed' || refund.status === 'rejected' ? 'red' : 'amber'}
                  body={`${formatRupees((refund.approved_amount_paise ?? refund.requested_amount_paise) / 100)} requested for ${refund.reason}.`}
                />
              ))}
            </ol>
          </AdminSection>

          <AdminSection title="Webhook records">
            {webhookEvents.length ? (
              <div className="space-y-3">
                {webhookEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-stone-100 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-xs font-semibold text-neutral-950">{event.event_id}</p>
                      <StatusBadge value={event.processed ? 'processed' : 'pending'} tone={event.processed ? 'green' : 'amber'} />
                    </div>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <DetailLine label="Type" value={event.event_type} />
                      <DetailLine label="Provider" value={event.provider} />
                      <DetailLine label="Payload hash" value={event.payload_hash.slice(0, 18)} />
                      <DetailLine label="Created" value={formatDateTime(event.created_at)} />
                      <DetailLine label="Processed" value={event.processed_at ? formatDateTime(event.processed_at) : 'Not processed'} />
                      {event.processing_error ? <DetailLine label="Error" value={event.processing_error} /> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No matching webhook events" description="Idempotent Razorpay webhook records will appear after webhook traffic is connected." />
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
              <EmptyState title="No audit entries" description="Payment write operations will add audit entries where an admin action is involved." />
            )}
          </AdminSection>
        </div>

        <aside className="space-y-6">
          <AdminSection title="Gateway metadata">
            <div className="space-y-3 text-sm">
              <DetailLine label="Internal ID" value={<span className="font-mono text-xs">{payment.id}</span>} />
              <DetailLine label="Gateway" value={payment.gateway} />
              <DetailLine label="Provider mode" value={payment.provider} />
              <DetailLine label="Gateway order ID" value={payment.gateway_order_id ?? 'integration pending'} />
              <DetailLine label="Gateway payment ID" value={payment.gateway_payment_id ?? 'Not received'} />
              <DetailLine label="Method" value={payment.method ?? 'Not known'} />
              <DetailLine label="Captured" value={payment.captured ? 'Yes' : 'No'} />
              <DetailLine label="Created" value={formatDateTime(payment.created_at)} />
            </div>
          </AdminSection>

          <AdminSection title="Order and customer">
            {payment.order ? (
              <div className="space-y-3 text-sm">
                <DetailLine
                  label="Order"
                  value={
                    <Link href={`/admin/orders/${payment.order_id}`} className="font-semibold text-gold-700 hover:text-gold-800">
                      {payment.order.order_number ?? payment.order.checkout_reference ?? payment.order_id.slice(0, 8)}
                    </Link>
                  }
                />
                <DetailLine label="Customer" value={payment.order.customer_name} />
                <DetailLine label="Phone" value={payment.order.customer_phone} />
                <DetailLine label="Order status" value={<StatusBadge value={payment.order.order_status} tone="gold" />} />
                <DetailLine label="Payment status" value={<StatusBadge value={payment.order.payment_status} tone={payment.order.payment_status === 'failed' ? 'red' : 'amber'} />} />
              </div>
            ) : (
              <EmptyState title="Order missing" description="The payment record references an order that was not returned." />
            )}
          </AdminSection>

          <AdminSection title="Failure details">
            {payment.failure_code || payment.failure_reason ? (
              <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  Failed payment
                </div>
                <DetailLine label="Code" value={payment.failure_code ?? 'Not provided'} />
                <DetailLine label="Reason" value={payment.failure_reason ?? 'Not provided'} />
              </div>
            ) : (
              <EmptyState title="No failure reason" description="Gateway failure codes will be stored when returned by Razorpay." />
            )}
          </AdminSection>

          <AdminSection title="Refund records">
            {refunds.length ? (
              <div className="space-y-3">
                {refunds.map((refund) => (
                  <RefundCard key={refund.id} refund={refund} />
                ))}
              </div>
            ) : (
              <EmptyState title="No refunds" description="Full and partial refund records will appear here." />
            )}
          </AdminSection>

          <AdminSection title="Integration readiness">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                Razorpay-safe mode
              </div>
              <p className="leading-6">
                This record is handled through the provider abstraction. Mock mode returns gateway-shaped IDs and never calls live Razorpay APIs.
              </p>
            </div>
          </AdminSection>
        </aside>
      </div>
    </div>
  );
}

function TimelineItem({
  title,
  date,
  body,
  tone,
}: {
  title: string;
  date: string;
  body: string;
  tone: 'green' | 'red' | 'blue' | 'amber';
}) {
  return (
    <li className="rounded-xl border border-stone-100 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge value={title} tone={tone} />
        <span className="text-xs text-neutral-500">{formatDateTime(date)}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{body}</p>
    </li>
  );
}

function RefundCard({ refund }: { refund: RefundRecord }) {
  return (
    <div className="rounded-xl border border-stone-100 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs font-semibold">{refund.id.slice(0, 8)}</p>
        <StatusBadge value={refund.status} tone={refund.status === 'failed' || refund.status === 'rejected' ? 'red' : refund.status === 'processed' ? 'green' : 'amber'} />
      </div>
      <div className="mt-2 space-y-1">
        <DetailLine label="Requested" value={formatRupees(refund.requested_amount_paise / 100)} />
        <DetailLine label="Approved" value={refund.approved_amount_paise ? formatRupees(refund.approved_amount_paise / 100) : 'Pending'} />
        <DetailLine label="Gateway refund ID" value={refund.gateway_refund_id ?? 'integration pending'} />
        <DetailLine label="Reason" value={refund.reason} />
      </div>
    </div>
  );
}

function DetailLine({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right text-neutral-900">{value}</span>
    </div>
  );
}
