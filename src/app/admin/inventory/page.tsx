import { Boxes, PackageX, TrendingDown } from 'lucide-react';
import { AdminPageHeader, AdminSection, EmptyState, MetricCard, StatusBadge } from '../_components/ui';
import { getInventoryPageData } from '@/server/admin-modules';
import { requireAdminPagePermission } from '@/lib/admin/permissions';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Inventory · Admin' };

export default async function InventoryPage() {
  await requireAdminPagePermission('inventory.read');
  const { products, movements } = await getInventoryPageData();
  const lowStock = products.filter((product) => {
    const available = Math.max(0, product.stock_count - (product.reserved_stock ?? 0));
    return available > 0 && available <= (product.low_stock_threshold ?? 5);
  });
  const outOfStock = products.filter((product) => product.stock_count <= 0 || !product.in_stock);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdminPageHeader
        title="Inventory"
        description="Track current, reserved and available stock. Stock is reserved during pending Razorpay attempts, released after failure/cancellation/expiry, and committed only after verified captured online payment."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Tracked products" value={products.length.toLocaleString('en-IN')} icon={Boxes} tone="blue" />
        <MetricCard label="Low stock" value={lowStock.length.toLocaleString('en-IN')} icon={TrendingDown} tone="amber" />
        <MetricCard label="Out of stock" value={outOfStock.length.toLocaleString('en-IN')} icon={PackageX} tone="red" />
      </div>

      <AdminSection title="Stock position" description="Read-only stock visibility. Reservation and sale changes remain controlled by the payment-safe inventory RPCs.">
        {products.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[58rem] text-left">
              <thead>
                <tr className="border-b border-stone-100 text-xs text-neutral-500">
                  <th className="py-3 pr-4 font-semibold">Product</th>
                  <th className="py-3 pr-4 font-semibold">SKU</th>
                  <th className="py-3 pr-4 font-semibold">Current</th>
                  <th className="py-3 pr-4 font-semibold">Reserved</th>
                  <th className="py-3 pr-4 font-semibold">Available</th>
                  <th className="py-3 pr-4 font-semibold">Threshold</th>
                  <th className="py-3 pr-4 font-semibold">Reorder</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Last restocked</th>
                  <th className="py-3 pr-4 font-semibold">Last sold</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const available = Math.max(0, product.stock_count - (product.reserved_stock ?? 0));
                  const status = product.stock_count <= 0 || !product.in_stock ? 'out_of_stock' : available <= (product.low_stock_threshold ?? 5) ? 'low_stock' : 'in_stock';
                  return (
                    <tr key={product.id} className="border-b border-stone-50 text-sm">
                      <td className="py-3 pr-4 font-semibold">{product.name}</td>
                      <td className="py-3 pr-4 text-neutral-500">{product.sku ?? 'Not set'}</td>
                      <td className="py-3 pr-4">{product.stock_count}</td>
                      <td className="py-3 pr-4">{product.reserved_stock ?? 0}</td>
                      <td className="py-3 pr-4 font-semibold">{available}</td>
                      <td className="py-3 pr-4">{product.low_stock_threshold ?? 5}</td>
                      <td className="py-3 pr-4">{product.reorder_level ?? 0}</td>
                      <td className="py-3 pr-4"><StatusBadge value={status} tone={status === 'out_of_stock' ? 'red' : status === 'low_stock' ? 'amber' : 'green'} /></td>
                      <td className="py-3 pr-4 text-xs text-neutral-500">{product.last_restocked_at ? formatDateTime(product.last_restocked_at) : '—'}</td>
                      <td className="py-3 pr-4 text-xs text-neutral-500">{product.last_sold_at ? formatDateTime(product.last_sold_at) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No inventory records" description="Products will appear here after the catalog is loaded." />
        )}
      </AdminSection>

      <div className="mt-6">
        <AdminSection title="Recent inventory movements">
          {movements.length ? (
            <div className="space-y-3">
              {movements.map((movement) => (
                <div key={movement.adjustment_id} className="rounded-lg border border-stone-100 p-3 text-sm">
                  <p className="font-semibold">{movement.type.replace(/_/g, ' ')} · {movement.quantity_change}</p>
                  <p className="mt-1 text-xs text-neutral-500">{movement.reason} · {formatDateTime(movement.created_at)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No stock movements yet" description="Recorded reservation, release and sale movements will appear here." />
          )}
        </AdminSection>
      </div>
    </div>
  );
}
