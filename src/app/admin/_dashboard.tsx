import Link from 'next/link';
import {
  AlertTriangle,
  Boxes,
  CreditCard,
  IndianRupee,
  PackageCheck,
  PackageX,
  ReceiptIndianRupee,
  RotateCcw,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AdminPageHeader, AdminSection, EmptyState, MetricCard, MiniBarChart, StatusBadge } from './_components/ui';
import { formatDateTime, formatRupees } from '@/lib/utils';
import { maskAdminPhone } from '@/lib/admin/privacy';
import type { DashboardData } from '@/server/admin';

const dateFilters = [
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
] as const;

export default function AdminDashboard({ data }: { data: DashboardData }) {
  const metrics = [
    { label: 'Gross revenue', value: formatRupees(data.metrics.grossRevenue), icon: IndianRupee, tone: 'green' as const },
    { label: 'Net revenue', value: formatRupees(data.metrics.netRevenue), icon: ReceiptIndianRupee, tone: 'gold' as const },
    { label: 'Total orders', value: data.metrics.totalOrders.toLocaleString('en-IN'), icon: ShoppingCart, tone: 'blue' as const },
    { label: 'Verified placed orders', value: data.metrics.paidOrders.toLocaleString('en-IN'), icon: CreditCard, tone: 'green' as const },
    { label: 'Pending payments', value: data.metrics.pendingPayments.toLocaleString('en-IN'), icon: AlertTriangle, tone: 'amber' as const },
    { label: 'Cancelled orders', value: data.metrics.cancelledOrders.toLocaleString('en-IN'), icon: PackageX, tone: 'red' as const },
    { label: 'Refund amount', value: formatRupees(data.metrics.refundAmount), icon: RotateCcw, tone: 'red' as const },
    { label: 'Total customers', value: data.metrics.totalCustomers.toLocaleString('en-IN'), icon: Users, tone: 'blue' as const },
    { label: 'New customers', value: data.metrics.newCustomers.toLocaleString('en-IN'), icon: TrendingUp, tone: 'gold' as const },
    { label: 'Active products', value: data.metrics.activeProducts.toLocaleString('en-IN'), icon: PackageCheck, tone: 'green' as const },
    { label: 'Low-stock products', value: data.metrics.lowStockProducts.toLocaleString('en-IN'), icon: Boxes, tone: 'amber' as const },
    { label: 'Out-of-stock products', value: data.metrics.outOfStockProducts.toLocaleString('en-IN'), icon: PackageX, tone: 'red' as const },
    { label: 'Average order value', value: formatRupees(data.metrics.averageOrderValue), icon: ReceiptIndianRupee, tone: 'neutral' as const },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdminPageHeader
        title="Dashboard"
        description={`Verified commerce activity for ${data.rangeLabel.toLowerCase()}. Test records and unverified payments are excluded from sales.`}
        action={
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-stone-200 bg-white p-1" aria-label="Dashboard date range">
            {dateFilters.map((filter) => (
              <Link
                key={filter.value}
                href={`/admin?range=${filter.value}`}
                aria-current={data.range === filter.value ? 'page' : undefined}
                className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition ${
                  data.range === filter.value
                    ? 'bg-neutral-950 text-white'
                    : 'text-neutral-500 hover:bg-stone-50 hover:text-neutral-950'
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        }
      />

      <p className="mb-4 text-right text-xs text-neutral-500">Updated {formatDateTime(data.generatedAt)}</p>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <AdminSection title="Revenue over time" description="Paid and captured order totals. Test orders are hidden when classified.">
          <MiniBarChart data={data.revenueOverTime} valuePrefix="inr" />
        </AdminSection>
        <AdminSection title="Orders over time" description="Verified placed orders by creation date.">
          <MiniBarChart data={data.ordersOverTime} />
        </AdminSection>
        <AdminSection title="Payment method distribution">
          <MiniBarChart data={data.paymentDistribution} />
        </AdminSection>
        <AdminSection title="Order status distribution">
          <MiniBarChart data={data.orderStatusDistribution} />
        </AdminSection>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-3">
        <AdminSection title="Top-selling products">
          <MiniBarChart data={data.topProducts} />
        </AdminSection>
        <AdminSection title="Low-stock products">
          {data.lowStockProducts.length ? (
            <div className="space-y-3">
              {data.lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-100 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{product.name}</p>
                    <p className="text-xs text-neutral-500">SKU {product.sku ?? 'Not set'}</p>
                  </div>
                  <StatusBadge value={`${Math.max(0, product.stock_count - (product.reserved_stock ?? 0))} left`} tone="amber" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No low-stock alerts" description="Products will appear here when available stock drops below threshold." />
          )}
        </AdminSection>
        <AdminSection title="Recent admin activities">
          {data.recentActivities.length ? (
            <div className="space-y-3">
              {data.recentActivities.map((activity) => (
                <div key={activity.id} className="rounded-lg border border-stone-100 p-3">
                  <p className="text-sm font-semibold">{activity.action}</p>
                  <p className="text-xs text-neutral-500">
                    {activity.entity} · {formatDateTime(activity.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No admin activity in this period" description="Recorded admin actions will appear here." />
          )}
        </AdminSection>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminSection title="Recent orders" action={<Link href="/admin/orders" className="text-sm font-semibold text-gold-700">View all</Link>}>
          <OrderRows orders={data.recentOrders} />
        </AdminSection>
        <AdminSection title="Pending payment verification" action={<Link href="/admin/payments" className="text-sm font-semibold text-gold-700">Review</Link>}>
          <OrderRows orders={data.pendingPaymentOrders} emptyTitle="No pending payments" />
        </AdminSection>
        <AdminSection title="Failed payments">
          {data.failedPayments.length ? (
            <div className="space-y-3">
              {data.failedPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-100 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{payment.gateway_payment_id ?? payment.id}</p>
                    <p className="text-xs text-neutral-500">{payment.failure_reason ?? 'Failure reason unavailable'}</p>
                  </div>
                  <StatusBadge value="failed" tone="red" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No failed payments" description="Failed payment attempts will appear here." />
          )}
        </AdminSection>
        <AdminSection title="Pending refunds">
          {data.pendingRefunds.length ? (
            <div className="space-y-3">
              {data.pendingRefunds.map((refund) => (
                <div key={refund.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-100 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{refund.reason}</p>
                    <p className="text-xs text-neutral-500">{formatRupees(refund.requested_amount_paise / 100)}</p>
                  </div>
                  <StatusBadge value={refund.status} tone="amber" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No pending refunds" description="Refund requests and processing items will appear here." />
          )}
        </AdminSection>
        <AdminSection title="Recent customers">
          {data.recentCustomers.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.recentCustomers.map((customer) => (
                <div key={customer.id} className="rounded-lg border border-stone-100 p-3">
                  <p className="truncate text-sm font-semibold">{customer.full_name ?? customer.email ?? customer.phone ?? 'Customer'}</p>
                  <p className="truncate text-xs text-neutral-500">{customer.email ?? maskAdminPhone(customer.phone)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No customers yet" />
          )}
        </AdminSection>
      </div>
    </div>
  );
}

function OrderRows({ orders, emptyTitle = 'No orders yet' }: { orders: DashboardData['recentOrders']; emptyTitle?: string }) {
  if (!orders.length) return <EmptyState title={emptyTitle} description="Matching orders will appear here." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[42rem] text-left">
        <thead>
          <tr className="border-b border-stone-100 text-xs text-neutral-500">
            <th className="py-2 pr-3 font-semibold">Order</th>
            <th className="py-2 pr-3 font-semibold">Customer</th>
            <th className="py-2 pr-3 font-semibold">Amount</th>
            <th className="py-2 pr-3 font-semibold">Payment</th>
            <th className="py-2 pr-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-stone-50 text-sm">
              <td className="py-3 pr-3 font-semibold">
                <Link href={`/admin/orders/${order.id}`} className="hover:text-gold-700">
                  {order.order_number ?? order.checkout_reference ?? order.id.slice(0, 8)}
                </Link>
              </td>
              <td className="py-3 pr-3">
                <p className="font-medium">{order.customer_name}</p>
                <p className="text-xs text-neutral-500">{order.customer_phone}</p>
              </td>
              <td className="py-3 pr-3 font-semibold">{formatRupees(order.final_amount ?? order.total)}</td>
              <td className="py-3 pr-3"><StatusBadge value={order.payment_status} tone={order.payment_status === 'failed' ? 'red' : 'gold'} /></td>
              <td className="py-3 pr-3"><StatusBadge value={order.order_status} tone="blue" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
