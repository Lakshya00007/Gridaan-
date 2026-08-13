import 'server-only';

import { randomUUID } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/server';
import type { Order, PaymentStatus } from '@/types';
import { ShippingError } from './errors';
import { validatePackageDetails } from './package';
import type { PackageDetails, ShipmentRecord, ShippingProviderName } from './types';
import { getNimbusPostReadiness } from './config';

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

  throw new ShippingError({
    code: 'provider_contract_missing',
    message: 'NimbusPost official API contract is required before live provider calls can run.',
    status: 503,
    safeDetails: { missing: readiness.missing },
  });
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
