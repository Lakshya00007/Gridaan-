import { Users } from 'lucide-react';
import { AdminPageHeader, AdminSection, EmptyState, MetricCard, StatusBadge } from '../_components/ui';
import { getCustomersPageData } from '@/server/admin-modules';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { formatDateTime, formatRupees } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Customers · Admin' };

export default async function CustomersPage() {
  await requireAdminPermission('customers.read');
  const { customers } = await getCustomersPageData();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdminPageHeader
        title="Customers"
        description="Profile, address, order, payment, refund, coupon and loyalty history surfaces. Card/UPI PIN/CVV/banking password data is never stored."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Customers" value={customers.length.toLocaleString('en-IN')} icon={Users} tone="blue" />
        <MetricCard label="High value" value={customers.filter((c) => c.status === 'high_value').length.toLocaleString('en-IN')} icon={Users} tone="gold" />
        <MetricCard label="Blocked" value={customers.filter((c) => c.status === 'blocked').length.toLocaleString('en-IN')} icon={Users} tone="red" />
      </div>
      <AdminSection title="Customer list">
        {customers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[58rem] text-left">
              <thead>
                <tr className="border-b border-stone-100 text-xs text-neutral-500">
                  <th className="py-3 pr-4 font-semibold">Name</th>
                  <th className="py-3 pr-4 font-semibold">Email</th>
                  <th className="py-3 pr-4 font-semibold">Phone</th>
                  <th className="py-3 pr-4 font-semibold">Registered</th>
                  <th className="py-3 pr-4 font-semibold">Orders</th>
                  <th className="py-3 pr-4 font-semibold">Total spent</th>
                  <th className="py-3 pr-4 font-semibold">AOV</th>
                  <th className="py-3 pr-4 font-semibold">Loyalty</th>
                  <th className="py-3 pr-4 font-semibold">Last order</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-stone-50 text-sm">
                    <td className="py-3 pr-4 font-semibold">{customer.full_name ?? 'Guest customer'}</td>
                    <td className="py-3 pr-4">{customer.email ?? '—'}</td>
                    <td className="py-3 pr-4">{customer.phone ?? '—'}</td>
                    <td className="py-3 pr-4 text-xs text-neutral-500">{formatDateTime(customer.created_at)}</td>
                    <td className="py-3 pr-4">{customer.total_orders}</td>
                    <td className="py-3 pr-4">{formatRupees(customer.total_spent)}</td>
                    <td className="py-3 pr-4">{formatRupees(customer.average_order_value)}</td>
                    <td className="py-3 pr-4">0</td>
                    <td className="py-3 pr-4 text-xs text-neutral-500">{customer.last_order_at ? formatDateTime(customer.last_order_at) : '—'}</td>
                    <td className="py-3 pr-4"><StatusBadge value={customer.status} tone={customer.status === 'blocked' ? 'red' : customer.status === 'high_value' ? 'gold' : 'green'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No customers yet" description="Registered profiles and customer ledger records will appear here." />
        )}
      </AdminSection>
    </div>
  );
}
