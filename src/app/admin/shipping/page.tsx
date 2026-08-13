import Link from 'next/link';
import { AlertTriangle, Box, CircleDollarSign, PackageCheck, Truck } from 'lucide-react';
import { requireAdminPagePermission } from '@/lib/admin/permissions';
import { AdminPageHeader, AdminSection, EmptyState, MetricCard, StatusBadge } from '../_components/ui';
import { getAdminShippingDashboard } from '@/server/shipping';
import { formatDateTime, formatRupees } from '@/lib/utils';
import type { ReadyToShipOrder, ShipmentRecord } from '@/lib/shipping/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Shipping · Admin' };

export default async function AdminShippingPage() {
  await requireAdminPagePermission('shipping.read');
  const dashboard = await getAdminShippingDashboard();
  const activeShipments = dashboard.shipments.filter(
    (shipment) => !['delivered', 'cancelled', 'rto_delivered', 'lost'].includes(shipment.status)
  );
  const carrierCost = dashboard.shipments.reduce(
    (sum, shipment) => sum + Number(shipment.charged_carrier_cost ?? 0),
    0
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdminPageHeader
        title="Shipping"
        description="Packing queue, outbound shipment status, and NimbusPost activation readiness."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ready to pack" value={dashboard.readyToShipOrders.length} icon={Box} tone="amber" />
        <MetricCard label="Active shipments" value={activeShipments.length} icon={Truck} tone="blue" />
        <MetricCard label="Delivered" value={dashboard.queues.delivered.length} icon={PackageCheck} tone="green" />
        <MetricCard label="Carrier cost" value={formatRupees(carrierCost)} icon={CircleDollarSign} tone="gold" />
      </div>

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">
              NimbusPost live shipment creation is {dashboard.readiness.enabled ? 'blocked' : 'disabled'}.
            </p>
            <p>
              No wallet-affecting operation can run until official NimbusPost API documentation,
              authentication details, prepaid courier setup, wallet funding, and pickup location are verified.
            </p>
            {dashboard.migrationRequired ? (
              <p className="mt-2 font-semibold">
                Apply the shipping migration before using shipment records in production.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(24rem,0.85fr)]">
        <AdminSection
          title="Ready to Ship"
          description="Captured Razorpay orders without an active outbound shipment."
        >
          {dashboard.readyToShipOrders.length ? (
            <ReadyOrderTable orders={dashboard.readyToShipOrders} />
          ) : (
            <EmptyState
              title="No ready orders"
              description="Paid orders appear here after Razorpay capture and before an active shipment exists."
            />
          )}
        </AdminSection>

        <AdminSection title="NimbusPost Readiness">
          <div className="space-y-3 text-sm">
            <ReadinessLine label="Feature flag" value={dashboard.readiness.enabled ? 'Enabled' : 'Disabled'} />
            <ReadinessLine label="Serviceability API" value={dashboard.readiness.canCheckServiceability ? 'Available' : 'Unavailable'} />
            <ReadinessLine label="Rate lookup" value={dashboard.readiness.canFetchRates ? 'Available' : 'Unavailable'} />
            <ReadinessLine label="Live booking" value={dashboard.readiness.canCreateLiveShipments ? 'Available' : 'Unavailable'} />
            <ReadinessLine label="Tracking sync" value={dashboard.readiness.canSyncTracking ? 'Available' : 'Unavailable'} />
          </div>
          <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase text-neutral-500">Required before activation</p>
            <ul className="mt-2 space-y-1 text-sm leading-6 text-neutral-700">
              {dashboard.readiness.missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </AdminSection>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ShipmentQueue title="Booked" shipments={dashboard.queues.booked} />
        <ShipmentQueue title="Pickup Pending" shipments={dashboard.queues.pickupPending} />
        <ShipmentQueue title="In Transit" shipments={dashboard.queues.inTransit} />
        <ShipmentQueue title="NDR" shipments={dashboard.queues.ndr} />
        <ShipmentQueue title="RTO" shipments={dashboard.queues.rto} />
        <ShipmentQueue title="Exceptions" shipments={dashboard.queues.exceptions} />
      </div>
    </div>
  );
}

function ReadyOrderTable({ orders }: { orders: ReadyToShipOrder[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[48rem] text-left">
        <thead>
          <tr className="border-b border-stone-100 text-xs text-neutral-500">
            <th className="py-3 pr-4 font-semibold">Order</th>
            <th className="py-3 pr-4 font-semibold">Customer</th>
            <th className="py-3 pr-4 font-semibold">Destination</th>
            <th className="py-3 pr-4 font-semibold">Shipping charged</th>
            <th className="py-3 pr-4 font-semibold">Payment</th>
            <th className="py-3 pr-4 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-stone-50 text-sm">
              <td className="py-3 pr-4 font-semibold text-neutral-950">
                {order.order_number ?? order.checkout_reference ?? order.id.slice(0, 8)}
              </td>
              <td className="py-3 pr-4">
                <p className="font-medium text-neutral-900">{order.customer_name}</p>
                <p className="text-xs text-neutral-500">{order.customer_phone}</p>
              </td>
              <td className="py-3 pr-4 text-neutral-600">
                {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}
              </td>
              <td className="py-3 pr-4">{order.shipping === 0 ? 'Free' : formatRupees(order.shipping)}</td>
              <td className="py-3 pr-4">
                <StatusBadge value={order.payment_status} tone="green" />
              </td>
              <td className="py-3 pr-4 text-right">
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="inline-flex rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-stone-50"
                >
                  Open order
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShipmentQueue({ title, shipments }: { title: string; shipments: ShipmentRecord[] }) {
  return (
    <AdminSection title={title}>
      {shipments.length ? (
        <div className="space-y-3">
          {shipments.slice(0, 8).map((shipment) => (
            <div key={shipment.id} className="rounded-lg border border-stone-100 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/admin/orders/${shipment.order_id}`}
                  className="font-semibold text-neutral-950 hover:text-gold-700"
                >
                  {shipment.order?.order_number ?? shipment.order_id.slice(0, 8)}
                </Link>
                <StatusBadge value={shipment.status} tone={shipment.status === 'delivered' ? 'green' : shipment.status === 'ndr' ? 'amber' : 'blue'} />
              </div>
              <div className="mt-2 grid gap-1 text-xs text-neutral-600 sm:grid-cols-2">
                <span>Courier: {shipment.courier_name ?? 'Not selected'}</span>
                <span>AWB: {shipment.awb ?? 'Not assigned'}</span>
                <span>Cost: {shipment.charged_carrier_cost == null ? 'Not returned' : formatRupees(shipment.charged_carrier_cost)}</span>
                <span>Updated: {formatDateTime(shipment.updated_at)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title={`No ${title.toLowerCase()} shipments`} />
      )}
    </AdminSection>
  );
}

function ReadinessLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-neutral-500">{label}</span>
      <span className="font-semibold text-neutral-950">{value}</span>
    </div>
  );
}
