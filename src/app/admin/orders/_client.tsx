'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  ExternalLink,
  Eye,
  LucideIcon,
  MessageCircle,
  Search,
  Truck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatRupees, formatDateTime, cn } from '@/lib/utils';
import { buildAdminOrderLink, buildCustomerOrderLink, buildStatusUpdateLink } from '@/lib/whatsapp-links';
import {
  formatAdminPaymentLabel,
  formatPaymentMethod,
  isManualPaymentMethod,
} from '@/lib/manual-payment';
import type { Order, OrderStatus, PaymentMethod, PaymentStatus } from '@/types';

const STATUSES: OrderStatus[] = [
  'draft',
  'pending_payment',
  'payment_processing',
  'placed',
  'confirmed',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'return_requested',
  'returned',
];
const PAYMENT_STATUSES: PaymentStatus[] = [
  'pending',
  'authorised',
  'captured',
  'failed',
  'partially_refunded',
  'refunded',
];
const PAYMENT_METHODS: PaymentMethod[] = ['razorpay', 'upi', 'card', 'netbanking', 'wallet', 'emi'];
const statusColor: Record<OrderStatus, string> = {
  draft: 'bg-neutral-100 text-neutral-700',
  pending_payment: 'bg-amber-100 text-amber-700',
  payment_processing: 'bg-amber-100 text-amber-700',
  placed: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  packed: 'bg-cyan-100 text-cyan-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  out_for_delivery: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  return_requested: 'bg-orange-100 text-orange-700',
  returned: 'bg-neutral-200 text-neutral-700',
};

export default function OrdersAdmin({
  orders: initial,
  adminWhatsappNumber,
  page,
  pageSize,
  totalCount,
  hasMore,
}: {
  orders: Order[];
  adminWhatsappNumber: string | null;
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}) {
  const [orders, setOrders] = useState(initial);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentStatus>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | PaymentMethod>('all');
  const [fulfilmentFilter, setFulfilmentFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [openOrder, setOpenOrder] = useState<Order | null>(null);
  const router = useRouter();

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.order_status !== statusFilter) return false;
    if (paymentFilter !== 'all' && o.payment_status !== paymentFilter) return false;
    if (methodFilter !== 'all' && o.payment_method !== methodFilter) return false;
    if (fulfilmentFilter !== 'all' && (o.fulfilment_status ?? 'unfulfilled') !== fulfilmentFilter) return false;
    if (minAmount && Number(o.final_amount ?? o.total) < Number(minAmount)) return false;
    if (maxAmount && Number(o.final_amount ?? o.total) > Number(maxAmount)) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return [o.order_number, o.checkout_reference, o.customer_name, o.customer_phone, o.customer_email].some((f) =>
      (f ?? '').toLowerCase().includes(s)
    );
  });

  async function updateStatus(id: string, status: OrderStatus) {
    if (!window.confirm(`Change this order status to ${status.replace(/_/g, ' ')}?`)) return;
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ order_status: status }),
    });
    if (!res.ok) {
      toast.error('Failed to update');
      return;
    }
    setOrders(orders.map((o) => (o.id === id ? { ...o, order_status: status } : o)));
    if (openOrder?.id === id) setOpenOrder({ ...openOrder, order_status: status });
    toast.success(`Order ${status}`);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Orders</h1>
          <p className="text-sm text-neutral-500">
            Showing {(page - 1) * pageSize + (orders.length ? 1 : 0)}-
            {(page - 1) * pageSize + orders.length} of {Math.max(totalCount, orders.length).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | OrderStatus)} className="px-3 py-2 rounded-lg border border-neutral-200 text-sm">
            <option value="all">All order statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value as 'all' | PaymentStatus)} className="px-3 py-2 rounded-lg border border-neutral-200 text-sm">
            <option value="all">All payment statuses</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value as 'all' | PaymentMethod)} className="px-3 py-2 rounded-lg border border-neutral-200 text-sm">
            <option value="all">All methods</option>
            {PAYMENT_METHODS.map((s) => (
              <option key={s} value={s}>{formatPaymentMethod(s)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by order #, customer name, phone, email…"
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none"
        />
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl border border-neutral-100 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        <select value={fulfilmentFilter} onChange={(e) => setFulfilmentFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-neutral-200 text-sm">
          <option value="all">All fulfilment</option>
          <option value="unfulfilled">Unfulfilled</option>
          <option value="processing">Processing</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
        </select>
        <input
          type="number"
          min={0}
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value)}
          placeholder="Minimum amount"
          className="px-3 py-2 rounded-lg border border-neutral-200 text-sm"
        />
        <input
          type="number"
          min={0}
          value={maxAmount}
          onChange={(e) => setMaxAmount(e.target.value)}
          placeholder="Maximum amount"
          className="px-3 py-2 rounded-lg border border-neutral-200 text-sm"
        />
        <p className="flex items-center text-xs text-neutral-500">
          {filtered.length.toLocaleString('en-IN')} matching orders on this page
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-neutral-400">
          Server-side pagination keeps admin order loading predictable in production.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/admin/orders?page=${page - 1}`)}
            disabled={page <= 1}
            className="px-3 py-2 rounded-lg border border-neutral-200 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-neutral-500">Page {page}</span>
          <button
            onClick={() => router.push(`/admin/orders?page=${page + 1}`)}
            disabled={!hasMore}
            className="px-3 py-2 rounded-lg border border-neutral-200 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">No orders.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100 text-left bg-neutral-50">
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Order</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Customer</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Items</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Gross</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Discount</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Shipping</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Final</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Payment</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Fulfilment</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500 w-32"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                    <td className="px-4 py-3 text-sm font-medium">
                      <Link href={`/admin/orders/${o.id}`} className="hover:text-gold-700">
                        {o.order_number ?? o.checkout_reference ?? o.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-neutral-900">{o.customer_name}</p>
                      <p className="text-xs text-neutral-400">{o.customer_phone}</p>
                      {o.customer_email && <p className="text-xs text-neutral-400">{o.customer_email}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{(o.items ?? []).reduce((sum, item) => sum + item.quantity, 0)}</td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{formatDateTime(o.created_at)}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatRupees(o.gross_amount ?? o.subtotal + o.discount)}</td>
                    <td className="px-4 py-3 text-sm text-green-700">{o.discount > 0 ? `-${formatRupees(o.discount)}` : '—'}</td>
                    <td className="px-4 py-3 text-sm">{o.shipping === 0 ? 'FREE' : formatRupees(o.shipping)}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatRupees(o.final_amount ?? o.total)}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="space-y-1">
                        <span
                          className={cn(
                            'inline-flex font-medium px-2 py-0.5 rounded-full',
                            o.payment_status === 'captured'
                              ? 'bg-green-100 text-green-700'
                              : o.payment_status === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : o.payment_status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-neutral-200 text-neutral-700'
                          )}
                        >
                          {formatAdminPaymentLabel(o.payment_method, o.payment_status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700">
                        {(o.fulfilment_status ?? 'unfulfilled').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', statusColor[o.order_status])}>
                        {o.order_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {adminWhatsappNumber && (
                          <a
                            href={buildAdminOrderLink(o, adminWhatsappNumber)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-neutral-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                            title="WhatsApp admin"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => setOpenOrder(o)}
                          className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg"
                          title="Quick view"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="p-2 text-neutral-400 hover:text-gold-700 hover:bg-gold-50 rounded-lg"
                          title="Open order detail"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openOrder && (
        <OrderDrawer
          adminWhatsappNumber={adminWhatsappNumber}
          order={openOrder}
          onClose={() => setOpenOrder(null)}
          onStatus={(s) => updateStatus(openOrder.id, s)}
        />
      )}
    </div>
  );
}

function OrderDrawer({
  adminWhatsappNumber,
  order,
  onClose,
  onStatus,
}: {
  adminWhatsappNumber: string | null;
  order: Order;
  onClose: () => void;
  onStatus: (s: OrderStatus) => void;
}) {
  const isManualPayment = isManualPaymentMethod(order.payment_method);
  const isPendingManualPayment = isManualPayment && order.payment_status === 'pending';

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end" onClick={onClose}>
      <div className="flex-1 bg-black/30" />
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md flex flex-col overflow-y-auto">
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <p className="font-semibold">{order.order_number ?? order.checkout_reference ?? order.id.slice(0, 8)}</p>
            <p className="text-xs text-neutral-400">{formatDateTime(order.created_at)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg">×</button>
        </div>
        <div className="p-5 space-y-4">
          <Section title="Customer">
            <p className="text-sm font-medium">{order.customer_name}</p>
            <p className="text-xs text-neutral-500">{order.customer_phone}</p>
            {order.customer_email && <p className="text-xs text-neutral-500">{order.customer_email}</p>}
          </Section>
          <Section title="Address">
            <p className="text-sm text-neutral-600">
              {order.shipping_address.line1}
              {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ''},<br />
              {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}
            </p>
          </Section>
          <Section title="Items">
            {order.items?.map((it) => (
              <div key={it.id} className="flex justify-between text-sm py-1.5 border-b border-neutral-50 last:border-0">
                <span className="truncate">
                  {it.product_name} <span className="text-neutral-400">×{it.quantity}</span>
                </span>
                <span className="font-medium ml-2">{formatRupees(it.line_total)}</span>
              </div>
            ))}
          </Section>
          <Section title="Summary">
            <SummaryRow label="Subtotal" value={formatRupees(order.subtotal)} />
            {order.discount > 0 && <SummaryRow label="Discount" value={`- ${formatRupees(order.discount)}`} className="text-green-600" />}
            <SummaryRow label="Shipping" value={order.shipping === 0 ? 'FREE' : formatRupees(order.shipping)} />
            <SummaryRow label="Final total" value={formatRupees(order.final_amount ?? order.total)} bold />
          </Section>
          <Section title="Payment">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm">
              <SummaryRow
                label="Method"
                value={formatPaymentMethod(order.payment_method)}
              />
              <SummaryRow
                label="Status"
                value={formatAdminPaymentLabel(order.payment_method, order.payment_status)}
              />
            </div>
          </Section>
          {isPendingManualPayment ? (
            <Section title="Legacy manual payment">
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">
                Manual payment approval is disabled. Unpaid orders can only become placed after a verified captured Razorpay payment.
              </div>
            </Section>
          ) : null}
          <Section title="Actions">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {(order.order_status === 'pending_payment' || order.order_status === 'payment_processing') && (
                <ActionBtn onClick={() => onStatus('cancelled')} icon={XCircle} className="bg-red-50 text-red-700">Cancel</ActionBtn>
              )}
              {order.order_status === 'placed' && (
                <>
                  {!isPendingManualPayment && (
                    <ActionBtn onClick={() => onStatus('confirmed')} icon={Check} className="bg-green-50 text-green-700">Confirm</ActionBtn>
                  )}
                  <ActionBtn onClick={() => onStatus('cancelled')} icon={XCircle} className="bg-red-50 text-red-700">Cancel</ActionBtn>
                </>
              )}
              {order.order_status === 'confirmed' && (
                <>
                  <ActionBtn onClick={() => onStatus('packed')} icon={Check} className="bg-cyan-50 text-cyan-700">Mark packed</ActionBtn>
                  <ActionBtn onClick={() => onStatus('cancelled')} icon={XCircle} className="bg-red-50 text-red-700">Cancel</ActionBtn>
                </>
              )}
              {order.order_status === 'packed' && (
                <ActionBtn onClick={() => onStatus('shipped')} icon={Truck} className="bg-blue-50 text-blue-700">Mark shipped</ActionBtn>
              )}
              {order.order_status === 'shipped' && (
                <ActionBtn onClick={() => onStatus('out_for_delivery')} icon={Truck} className="bg-purple-50 text-purple-700">Out for delivery</ActionBtn>
              )}
              {order.order_status === 'out_for_delivery' && (
                <ActionBtn onClick={() => onStatus('delivered')} icon={Check} className="bg-green-50 text-green-700">Mark delivered</ActionBtn>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 mt-3">
              {adminWhatsappNumber && (
                <a
                  href={buildAdminOrderLink(order, adminWhatsappNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100"
                >
                  <MessageCircle className="w-4 h-4" /> Send to admin on WhatsApp <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <a
                href={buildCustomerOrderLink(order)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gold-50 text-gold-700 rounded-xl text-sm font-medium hover:bg-gold-100"
              >
                <MessageCircle className="w-4 h-4" /> Notify customer on WhatsApp <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={buildStatusUpdateLink(order, order.order_status)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100"
              >
                <MessageCircle className="w-4 h-4" /> Send status update <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">{title}</p>
      <div>{children}</div>
    </div>
  );
}

function SummaryRow({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <div className={cn('flex justify-between text-sm py-1', className)}>
      <span className={bold ? 'font-semibold' : ''}>{label}</span>
      <span className={bold ? 'font-bold' : 'font-medium'}>{value}</span>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  icon: Icon,
  className,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon: LucideIcon;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium',
        className
      )}
    >
      <Icon className="w-3 h-3" /> {children}
    </button>
  );
}
