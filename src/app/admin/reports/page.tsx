import { BarChart3, Download } from 'lucide-react';
import { AdminPageHeader, AdminSection, EmptyState, MetricCard, MiniBarChart } from '../_components/ui';
import { getReportsPageData } from '@/server/admin-modules';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { formatRupees } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reports & Analytics · Admin' };

function csvEscape(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function buildCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [headers.map(csvEscape).join(','), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))].join('\n');
}

function CsvLink({ filename, rows }: { filename: string; rows: Record<string, unknown>[] }) {
  const csv = buildCsv(rows);
  if (!csv) return null;
  return (
    <a
      href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
      download={filename}
      className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:border-gold-300"
    >
      <Download className="h-3.5 w-3.5" />
      Export CSV
    </a>
  );
}

export default async function ReportsPage() {
  await requireAdminPermission('reports.read');
  const { orders, products, coupons } = await getReportsPageData();
  const paidOrders = orders.filter((order) => order.payment_status === 'captured' && order.order_status !== 'pending_payment');
  const grossSales = paidOrders.reduce((sum, order) => sum + Number(order.gross_amount ?? order.subtotal + order.discount), 0);
  const discounts = orders.reduce((sum, order) => sum + Number(order.discount ?? 0), 0);
  const netSales = paidOrders.reduce((sum, order) => sum + Number(order.final_amount ?? order.total ?? 0), 0);
  const shippingRevenue = paidOrders.reduce((sum, order) => sum + Number(order.shipping ?? 0), 0);
  const unitsSold = paidOrders.flatMap((order) => order.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
  const refundRate = paidOrders.length ? (orders.filter((order) => order.payment_status === 'refunded').length / paidOrders.length) * 100 : 0;
  const onlineShare = orders.length ? (orders.filter((order) => order.payment_method === 'razorpay').length / orders.length) * 100 : 0;

  const orderRows = orders.map((order) => ({
    order_number: order.order_number,
    customer: order.customer_name,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    order_status: order.order_status,
    total: order.final_amount ?? order.total,
    created_at: order.created_at,
  }));

  const productRows = products.map((product) => ({
    name: product.name,
    sku: product.sku ?? '',
    category: product.category?.name ?? '',
    price: product.price,
    stock: product.stock_count,
    reserved: product.reserved_stock ?? 0,
    active: product.is_active !== false,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdminPageHeader
        title="Reports & Analytics"
        description="Sales, order, product, category, payment, refund, inventory, customer, coupon and loyalty reporting. Cost and profit remain placeholders until cost data is complete."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Gross sales" value={formatRupees(grossSales)} icon={BarChart3} tone="green" />
        <MetricCard label="Discounts" value={formatRupees(discounts)} icon={BarChart3} tone="gold" />
        <MetricCard label="Net sales" value={formatRupees(netSales)} icon={BarChart3} tone="blue" />
        <MetricCard label="Shipping revenue" value={formatRupees(shippingRevenue)} icon={BarChart3} tone="neutral" />
        <MetricCard label="Cost placeholder" value={formatRupees(0)} icon={BarChart3} tone="neutral" />
        <MetricCard label="Profit placeholder" value={formatRupees(0)} icon={BarChart3} tone="neutral" />
        <MetricCard label="Units sold" value={unitsSold.toLocaleString('en-IN')} icon={BarChart3} tone="green" />
        <MetricCard label="Refund rate" value={`${refundRate.toFixed(1)}%`} icon={BarChart3} tone="amber" />
        <MetricCard label="Online payment share" value={`${onlineShare.toFixed(1)}%`} icon={BarChart3} tone="blue" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSection title="Orders report" action={<CsvLink filename="orders-report.csv" rows={orderRows} />}>
          {orders.length ? <MiniBarChart data={orders.slice(0, 12).map((order) => ({ label: order.order_number ?? order.checkout_reference ?? order.id.slice(0, 8), value: Number(order.final_amount ?? order.total ?? 0) }))} valuePrefix="inr" /> : <EmptyState title="No order data" />}
        </AdminSection>
        <AdminSection title="Product performance" action={<CsvLink filename="products-report.csv" rows={productRows} />}>
          {products.length ? <MiniBarChart data={products.slice(0, 12).map((product) => ({ label: product.name, value: product.stock_count }))} /> : <EmptyState title="No product data" />}
        </AdminSection>
        <AdminSection title="Coupon report">
          {coupons.length ? <MiniBarChart data={coupons.map((coupon) => ({ label: coupon.code, value: coupon.usage_count }))} /> : <EmptyState title="No coupon usage yet" />}
        </AdminSection>
        <AdminSection title="Payment mix">
          {orders.length ? (
            <MiniBarChart
              data={[
                { label: 'Online payment', value: Number(onlineShare.toFixed(1)) },
              ]}
            />
          ) : (
            <EmptyState title="No payment data" />
          )}
        </AdminSection>
      </div>
    </div>
  );
}
