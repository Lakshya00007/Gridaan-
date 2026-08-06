import { Percent } from 'lucide-react';
import { AdminPageHeader, AdminSection, EmptyState, MetricCard, StatusBadge } from '../_components/ui';
import { getCouponsPageData } from '@/server/admin-modules';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { formatDateTime, formatRupees } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Offers & Coupons · Admin' };

export default async function OffersPage() {
  await requireAdminPermission('coupons.read');
  const { coupons } = await getCouponsPageData();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdminPageHeader
        title="Offers & Coupons"
        description="Manage percentage, fixed amount, free shipping, product/category, first-order and minimum-cart discounts. Discounts must be calculated server-side."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Coupons" value={coupons.length.toLocaleString('en-IN')} icon={Percent} tone="blue" />
        <MetricCard label="Active" value={coupons.filter((c) => c.is_active).length.toLocaleString('en-IN')} icon={Percent} tone="green" />
        <MetricCard label="Used" value={coupons.reduce((sum, c) => sum + c.usage_count, 0).toLocaleString('en-IN')} icon={Percent} tone="gold" />
      </div>
      <AdminSection title="Coupon rules">
        {coupons.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] text-left">
              <thead>
                <tr className="border-b border-stone-100 text-xs text-neutral-500">
                  <th className="py-3 pr-4 font-semibold">Code</th>
                  <th className="py-3 pr-4 font-semibold">Name</th>
                  <th className="py-3 pr-4 font-semibold">Type</th>
                  <th className="py-3 pr-4 font-semibold">Value</th>
                  <th className="py-3 pr-4 font-semibold">Max discount</th>
                  <th className="py-3 pr-4 font-semibold">Min order</th>
                  <th className="py-3 pr-4 font-semibold">Usage</th>
                  <th className="py-3 pr-4 font-semibold">Start</th>
                  <th className="py-3 pr-4 font-semibold">Expiry</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-b border-stone-50 text-sm">
                    <td className="py-3 pr-4 font-semibold">{coupon.code}</td>
                    <td className="py-3 pr-4">{coupon.name ?? coupon.description ?? '—'}</td>
                    <td className="py-3 pr-4">{coupon.type.replace(/_/g, ' ')}</td>
                    <td className="py-3 pr-4">{coupon.type === 'percentage' ? `${coupon.value}%` : formatRupees(coupon.value)}</td>
                    <td className="py-3 pr-4">{coupon.max_discount ? formatRupees(coupon.max_discount) : '—'}</td>
                    <td className="py-3 pr-4">{formatRupees(coupon.min_order)}</td>
                    <td className="py-3 pr-4">{coupon.usage_count}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}</td>
                    <td className="py-3 pr-4 text-xs text-neutral-500">{coupon.starts_at ? formatDateTime(coupon.starts_at) : '—'}</td>
                    <td className="py-3 pr-4 text-xs text-neutral-500">{coupon.expires_at ? formatDateTime(coupon.expires_at) : '—'}</td>
                    <td className="py-3 pr-4"><StatusBadge value={coupon.is_active ? 'active' : 'inactive'} tone={coupon.is_active ? 'green' : 'neutral'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No coupons configured" description="Create coupon records to start tracking usage and redemptions." />
        )}
      </AdminSection>
    </div>
  );
}
