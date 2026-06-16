'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Truck, Check, XCircle, MessageCircle, ExternalLink, Eye, LucideIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatRupees, formatDateTime, cn } from '@/lib/utils';
import { buildAdminOrderLink, buildCustomerOrderLink, buildStatusUpdateLink } from '@/lib/whatsapp';
import type { Order, OrderStatus } from '@/types';

const STATUSES: OrderStatus[] = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'];
const statusColor: Record<OrderStatus, string> = {
  placed: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  returned: 'bg-neutral-200 text-neutral-700',
};

export default function OrdersAdmin({
  orders: initial,
  page,
  pageSize,
  totalCount,
  hasMore,
}: {
  orders: Order[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}) {
  const [orders, setOrders] = useState(initial);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [openOrder, setOpenOrder] = useState<Order | null>(null);
  const router = useRouter();

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.order_status !== statusFilter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return [o.order_number, o.customer_name, o.customer_phone, o.customer_email].some((f) =>
      (f ?? '').toLowerCase().includes(s)
    );
  });

  async function updateStatus(id: string, status: OrderStatus) {
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
            <option value="all">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
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
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Total</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Payment</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500 w-32"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                    <td className="px-4 py-3 text-sm font-medium">{o.order_number}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-neutral-900">{o.customer_name}</p>
                      <p className="text-xs text-neutral-400">{o.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{formatDateTime(o.created_at)}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatRupees(o.total)}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={cn(
                        'font-medium px-2 py-0.5 rounded-full',
                        o.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                        o.payment_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        o.payment_status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-neutral-200 text-neutral-700'
                      )}>
                        {o.payment_method} · {o.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', statusColor[o.order_status])}>
                        {o.order_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <a
                          href={buildAdminOrderLink(o)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-neutral-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                          title="WhatsApp admin"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => setOpenOrder(o)}
                          className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
          order={openOrder}
          onClose={() => setOpenOrder(null)}
          onStatus={(s) => updateStatus(openOrder.id, s)}
        />
      )}
    </div>
  );
}

function OrderDrawer({
  order,
  onClose,
  onStatus,
}: {
  order: Order;
  onClose: () => void;
  onStatus: (s: OrderStatus) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end" onClick={onClose}>
      <div className="flex-1 bg-black/30" />
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md flex flex-col overflow-y-auto">
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <p className="font-semibold">{order.order_number}</p>
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
            <SummaryRow label="Total" value={formatRupees(order.total)} bold />
          </Section>
          <Section title="Actions">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {order.order_status === 'placed' && (
                <>
                  <ActionBtn onClick={() => onStatus('confirmed')} icon={Check} className="bg-green-50 text-green-700">Confirm</ActionBtn>
                  <ActionBtn onClick={() => onStatus('cancelled')} icon={XCircle} className="bg-red-50 text-red-700">Cancel</ActionBtn>
                </>
              )}
              {order.order_status === 'confirmed' && (
                <ActionBtn onClick={() => onStatus('shipped')} icon={Truck} className="bg-blue-50 text-blue-700">Mark shipped</ActionBtn>
              )}
              {order.order_status === 'shipped' && (
                <ActionBtn onClick={() => onStatus('delivered')} icon={Check} className="bg-green-50 text-green-700">Mark delivered</ActionBtn>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 mt-3">
              <a
                href={buildAdminOrderLink(order)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100"
              >
                <MessageCircle className="w-4 h-4" /> Send to admin on WhatsApp <ExternalLink className="w-3 h-3" />
              </a>
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

function ActionBtn({ children, onClick, icon: Icon, className }: { children: React.ReactNode; onClick: () => void; icon: LucideIcon; className?: string }) {
  return (
    <button onClick={onClick} className={cn('flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium', className)}>
      <Icon className="w-3 h-3" /> {children}
    </button>
  );
}
