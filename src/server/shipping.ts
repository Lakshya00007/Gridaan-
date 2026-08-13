import 'server-only';

import { createServiceClient } from '@/lib/supabase/server';
import { getNimbusPostReadiness, type NimbusPostReadiness } from '@/lib/shipping/config';
import type { ReadyToShipOrder, ShipmentRecord } from '@/lib/shipping/types';

export type AdminShippingDashboard = {
  readiness: NimbusPostReadiness;
  migrationRequired: boolean;
  readyToShipOrders: ReadyToShipOrder[];
  shipments: ShipmentRecord[];
  queues: {
    booked: ShipmentRecord[];
    pickupPending: ShipmentRecord[];
    inTransit: ShipmentRecord[];
    ndr: ShipmentRecord[];
    delivered: ShipmentRecord[];
    rto: ShipmentRecord[];
    exceptions: ShipmentRecord[];
  };
};

function isMissingShippingSchema(error: { code?: string; message?: string } | null) {
  return Boolean(error && ['42P01', '42703', '42883'].includes(error.code ?? ''));
}

async function safeShippingQuery<T>(
  label: string,
  query: PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>,
  fallback: T
): Promise<{ data: T; migrationRequired: boolean }> {
  const { data, error } = await query;
  if (error) {
    if (isMissingShippingSchema(error)) {
      console.warn('[shipping-data] migration required', { label, code: error.code });
      return { data: fallback, migrationRequired: true };
    }
    console.warn('[shipping-data] query failed', { label, code: error.code, message: error.message });
    throw new Error('Shipping data could not be loaded');
  }
  return { data: (data as T) ?? fallback, migrationRequired: false };
}

function isTerminalActiveBlocking(status: string) {
  return ['delivered', 'cancelled', 'rto_delivered', 'lost'].includes(status);
}

function groupShipments(shipments: ShipmentRecord[]) {
  return {
    booked: shipments.filter((shipment) => shipment.status === 'booked'),
    pickupPending: shipments.filter((shipment) =>
      ['pickup_scheduled', 'picked_up'].includes(shipment.status)
    ),
    inTransit: shipments.filter((shipment) =>
      ['in_transit', 'out_for_delivery'].includes(shipment.status)
    ),
    ndr: shipments.filter((shipment) => shipment.status === 'ndr'),
    delivered: shipments.filter((shipment) => shipment.status === 'delivered'),
    rto: shipments.filter((shipment) =>
      ['rto_initiated', 'rto_in_transit', 'rto_delivered'].includes(shipment.status)
    ),
    exceptions: shipments.filter((shipment) =>
      ['booking_uncertain', 'booking_failed', 'delivery_exception', 'lost'].includes(shipment.status)
    ),
  };
}

export async function getShipmentsForOrder(orderId: string) {
  const supabase = createServiceClient();
  const result = await safeShippingQuery<ShipmentRecord[]>(
    'order-shipments',
    supabase
      .from('shipments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false }),
    []
  );
  return result.data;
}

export async function getAdminShippingDashboard(): Promise<AdminShippingDashboard> {
  const supabase = createServiceClient();
  const [ordersResult, shipmentsResult] = await Promise.all([
    safeShippingQuery<ReadyToShipOrder[]>(
      'ready-orders',
      supabase
        .from('orders')
        .select('id, order_number, checkout_reference, customer_name, customer_phone, customer_email, shipping_address, payment_status, order_status, fulfilment_status, shipping, final_amount, total, created_at, items:order_items(*)')
        .eq('payment_status', 'captured')
        .not('order_status', 'in', '("draft","pending_payment","payment_processing","cancelled","returned")')
        .order('created_at', { ascending: true })
        .limit(200),
      []
    ),
    safeShippingQuery<ShipmentRecord[]>(
      'shipments',
      supabase
        .from('shipments')
        .select('*, order:orders(id, order_number, checkout_reference, customer_name, customer_phone, customer_email, shipping_address, payment_status, order_status, shipping, final_amount, total, created_at)')
        .eq('direction', 'outbound')
        .order('created_at', { ascending: false })
        .limit(300),
      []
    ),
  ]);

  const activeShipmentOrderIds = new Set(
    shipmentsResult.data
      .filter((shipment) => !shipment.cancelled_at && !isTerminalActiveBlocking(shipment.status))
      .map((shipment) => shipment.order_id)
  );

  const readyToShipOrders = ordersResult.data.filter((order) => !activeShipmentOrderIds.has(order.id));
  const shipments = shipmentsResult.data;

  return {
    readiness: getNimbusPostReadiness(),
    migrationRequired: ordersResult.migrationRequired || shipmentsResult.migrationRequired,
    readyToShipOrders,
    shipments,
    queues: groupShipments(shipments),
  };
}
