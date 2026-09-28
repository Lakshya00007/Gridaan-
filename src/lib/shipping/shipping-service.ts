import 'server-only';

import { randomUUID } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/server';
import type { Order, PaymentStatus } from '@/types';
import { ShippingError } from './errors';
import { validatePackageDetails } from './package';
import type { PackageDetails, ShipmentRecord, ShippingProviderName } from './types';
import { getNimbusPostReadiness } from './config';
import { createNimbusPostClient } from './providers/nimbuspost/client';
import { isEligiblePrepaidQuote } from './rates';
import { mapNimbusPostStatus } from './providers/nimbuspost/mapper';
import { shouldApplyShipmentStatusUpdate } from './status';

export function assertOrderCanEnterShippingQueue(order: {
  payment_method: string;
  payment_status: PaymentStatus | string;
  order_status: string;
}) {
  if (order.payment_method !== 'razorpay') {
    throw new ShippingError({
      code: 'invalid_payment_provider',
      message: 'Only paid Razorpay orders can enter the shipping queue.',
      status: 409,
    });
  }

  if (order.payment_status !== 'captured') {
    throw new ShippingError({
      code: 'unpaid_order',
      message: 'Shipment preparation requires a captured Razorpay payment.',
      status: 409,
    });
  }

  if (['draft', 'pending_payment', 'payment_processing', 'cancelled', 'returned'].includes(order.order_status)) {
    throw new ShippingError({
      code: 'unpaid_order',
      message: 'This order status is not shippable.',
      status: 409,
    });
  }
}

export function assertNimbusPostProviderMutationAllowed() {
  const readiness = getNimbusPostReadiness();
  if (!readiness.enabled) {
    throw new ShippingError({
      code: 'shipping_disabled',
      message: 'NimbusPost live shipping is disabled.',
      status: 409,
      safeDetails: { missing: readiness.missing },
    });
  }

  if (!readiness.canCreateLiveShipments) {
    throw new ShippingError({
      code: 'shipping_not_configured',
      message: 'NimbusPost credentials and pickup address are required before live booking.',
      status: 503,
      safeDetails: { missing: readiness.missing },
    });
  }
}

export async function getShipmentRates(shipmentId: string) {
  assertNimbusPostProviderMutationAllowed();
  const supabase = createServiceClient();
  const { data: shipment, error: shipmentError } = await supabase.from('shipments').select('*').eq('id', shipmentId).single();
  if (shipmentError) throw shipmentError;
  if (shipment.status !== 'ready_to_ship') throw new ShippingError({ code: 'shipment_already_exists', message: 'This package is no longer ready for courier selection.', status: 409 });
  const { data: order, error: orderError } = await supabase.from('orders').select('*, items:order_items(*)').eq('id', shipment.order_id).single();
  if (orderError) throw orderError;
  assertOrderCanEnterShippingQueue(order);
  const client = createNimbusPostClient();
  const rates = await client.getRates({
    destination: order.shipping_address,
    packageDetails: {
      weightGrams: shipment.package_weight_grams,
      lengthCm: shipment.package_length_cm,
      widthCm: shipment.package_width_cm,
      heightCm: shipment.package_height_cm,
    },
    orderValue: Number(order.final_amount ?? order.total),
  });
  return rates.filter((rate) => isEligiblePrepaidQuote(rate));
}

export async function bookOutboundShipment({ shipmentId, courierId, maximumCharge }: {
  shipmentId: string;
  courierId: string;
  maximumCharge: number;
}) {
  const rates = await getShipmentRates(shipmentId);
  const selected = rates.find((rate) => rate.courierId === courierId);
  if (!selected) throw new ShippingError({ code: 'no_courier_available', message: 'Selected prepaid courier is unavailable.', status: 409 });
  if (selected.totalCharge > maximumCharge) throw new ShippingError({ code: 'no_courier_available', message: 'Courier price changed. Refresh the rates before booking.', status: 409 });

  const supabase = createServiceClient();
  const { data: claimed, error: claimError } = await supabase.from('shipments')
    .update({ status: 'booking_in_progress', courier_id: selected.courierId, courier_name: selected.courierName, charged_carrier_cost: selected.totalCharge })
    .eq('id', shipmentId).eq('status', 'ready_to_ship').select('*').maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) throw new ShippingError({ code: 'shipment_already_exists', message: 'Another booking attempt already started.', status: 409 });

  try {
    const { data: order, error: orderError } = await supabase.from('orders').select('*, items:order_items(*)').eq('id', claimed.order_id).single();
    if (orderError) throw orderError;
    assertOrderCanEnterShippingQueue(order);
    const result = await createNimbusPostClient().createShipment({
      orderId: claimed.order_id,
      provider: 'nimbuspost',
      idempotencyKey: claimed.local_idempotency_key,
      createdBy: claimed.created_by ?? '',
      shipment: claimed as ShipmentRecord,
      order: order as Order,
      courierId: selected.courierId,
      packageDetails: {
        weightGrams: claimed.package_weight_grams,
        lengthCm: claimed.package_length_cm,
        widthCm: claimed.package_width_cm,
        heightCm: claimed.package_height_cm,
      },
    });
    const { data: booked, error: bookError } = await supabase.from('shipments').update({
      status: mapNimbusPostStatus(result.rawStatus) ?? 'booked',
      raw_status: result.rawStatus,
      provider_shipment_id: result.providerShipmentId,
      provider_order_id: result.providerOrderId,
      provider_reference: order.order_number,
      awb: result.awb,
      courier_id: result.courierId,
      courier_name: result.courierName,
      label_url: result.labelUrl,
      booked_at: new Date().toISOString(),
      last_error_code: null,
      last_error_message: null,
    }).eq('id', shipmentId).eq('status', 'booking_in_progress').select('*').single();
    if (bookError) throw bookError;
    return booked as ShipmentRecord;
  } catch (error) {
    await supabase.from('shipments').update({
      status: 'booking_uncertain',
      last_error_code: error instanceof ShippingError ? error.code : 'shipment_creation_uncertain',
      last_error_message: 'Check the NimbusPost seller panel before any further booking action.',
    }).eq('id', shipmentId).eq('status', 'booking_in_progress');
    throw error;
  }
}

export async function syncOutboundShipmentTracking(shipmentId: string) {
  assertNimbusPostProviderMutationAllowed();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('shipments').select('*').eq('id', shipmentId).single();
  if (error) throw error;
  const shipment = data as ShipmentRecord;
  if (!shipment.awb) throw new ShippingError({ code: 'tracking_unavailable', message: 'AWB is not assigned.', status: 409 });
  const result = await createNimbusPostClient().syncTracking({ shipment });
  const next = result.status && shouldApplyShipmentStatusUpdate({ current: shipment.status, next: result.status }) ? result.status : shipment.status;
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase.from('shipments').update({
    status: next,
    raw_status: result.rawStatus,
    provider_metadata: { ...shipment.provider_metadata, last_tracking_history: result.history.slice(0, 20), last_tracking_sync_at: now },
    ...(next === 'delivered' && !shipment.delivered_at ? { delivered_at: now } : {}),
    ...(next === 'in_transit' && !shipment.shipped_at ? { shipped_at: now } : {}),
  }).eq('id', shipmentId).eq('status', shipment.status).select('*').single();
  if (updateError) throw updateError;
  return updated as ShipmentRecord;
}

export async function createOutboundShipmentDraft({
  orderId,
  packageDetails,
  createdBy,
  idempotencyKey,
  provider = 'nimbuspost',
}: {
  orderId: string;
  packageDetails: PackageDetails;
  createdBy: string;
  idempotencyKey?: string;
  provider?: ShippingProviderName;
}) {
  const validated = validatePackageDetails(packageDetails);
  if (!validated.ok) {
    throw new ShippingError({
      code: 'package_details_required',
      message: 'Package weight and dimensions are required before courier selection.',
      status: 422,
      safeDetails: { issues: validated.issues },
    });
  }

  const supabase = createServiceClient();
  const localIdempotencyKey = idempotencyKey?.trim() || `pack:${orderId}:${randomUUID()}`;

  const { data, error } = await supabase.rpc('begin_outbound_shipment_creation', {
    p_order_id: orderId,
    p_provider: provider,
    p_local_idempotency_key: localIdempotencyKey,
    p_created_by: createdBy,
    p_package_weight_grams: validated.packageDetails.weightGrams,
    p_package_length_cm: validated.packageDetails.lengthCm,
    p_package_width_cm: validated.packageDetails.widthCm,
    p_package_height_cm: validated.packageDetails.heightCm,
  });

  if (error) {
    if (error.message.toLowerCase().includes('active outbound shipment already exists')) {
      throw new ShippingError({
        code: 'shipment_already_exists',
        message: 'An active outbound shipment already exists for this order.',
        status: 409,
      });
    }
    if (error.message.toLowerCase().includes('captured razorpay payment')) {
      throw new ShippingError({
        code: 'unpaid_order',
        message: 'Shipment preparation requires a captured Razorpay payment.',
        status: 409,
      });
    }
    throw error;
  }

  const shipmentId = String(data);
  const { data: shipment, error: shipmentError } = await supabase
    .from('shipments')
    .select('*')
    .eq('id', shipmentId)
    .maybeSingle();

  if (shipmentError) throw shipmentError;
  return shipment as ShipmentRecord | null;
}

export function getPublicShipmentSummary(shipment: ShipmentRecord | null) {
  if (!shipment) return null;
  return {
    status: shipment.status,
    courier: shipment.courier_name,
    awb: shipment.awb,
    tracking_url: shipment.tracking_url,
    estimated_delivery_at: shipment.estimated_delivery_at,
    delivered_at: shipment.delivered_at,
  };
}

export function getOrderShippingAmount(order: Pick<Order, 'shipping'>) {
  return Number(order.shipping ?? 0);
}
