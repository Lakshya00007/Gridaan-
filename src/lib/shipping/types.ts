import type { Order, OrderAddress } from '@/types';

export const SHIPPING_PROVIDERS = ['nimbuspost'] as const;
export type ShippingProviderName = (typeof SHIPPING_PROVIDERS)[number];

export const CANONICAL_SHIPMENT_STATUSES = [
  'not_created',
  'ready_to_ship',
  'booking_in_progress',
  'booking_uncertain',
  'booking_failed',
  'booked',
  'pickup_scheduled',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'delivery_exception',
  'ndr',
  'rto_initiated',
  'rto_in_transit',
  'rto_delivered',
  'cancelled',
  'lost',
] as const;

export type CanonicalShipmentStatus = (typeof CANONICAL_SHIPMENT_STATUSES)[number];
export type ShipmentDirection = 'outbound' | 'reverse';
export type ServiceabilityStatus = 'serviceable' | 'unserviceable' | 'temporarily_unable_to_check';
export type PaymentCollectionMode = 'prepaid' | 'cod';

export type PackageDetails = {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type CourierQuote = {
  provider: ShippingProviderName;
  courierId: string;
  courierName: string;
  paymentMode: PaymentCollectionMode;
  serviceable: boolean;
  enabled: boolean;
  totalCharge: number;
  currency: 'INR';
  estimatedDeliveryAt?: string | null;
  rating?: number | null;
  rawQuote?: Record<string, unknown>;
};

export type ServiceabilityResult = {
  status: ServiceabilityStatus;
  pincode: string;
  provider: ShippingProviderName;
  requestId: string;
  checkedAt: string;
  message?: string;
};

export type ShipmentRecord = {
  id: string;
  order_id: string;
  provider: ShippingProviderName;
  direction: ShipmentDirection;
  provider_shipment_id: string | null;
  provider_order_id: string | null;
  provider_reference: string | null;
  local_idempotency_key: string;
  awb: string | null;
  courier_id: string | null;
  courier_name: string | null;
  status: CanonicalShipmentStatus;
  raw_status: string | null;
  tracking_url: string | null;
  label_url: string | null;
  label_reference: string | null;
  pickup_reference: string | null;
  pickup_status: string | null;
  package_weight_grams: number | null;
  package_length_cm: number | null;
  package_width_cm: number | null;
  package_height_cm: number | null;
  charged_carrier_cost: number | null;
  customer_shipping_amount: number | null;
  rto_carrier_cost: number | null;
  currency: string;
  estimated_delivery_at: string | null;
  created_by: string | null;
  metadata: Record<string, unknown>;
  provider_metadata: Record<string, unknown>;
  last_error_code: string | null;
  last_error_message: string | null;
  last_error_request_id: string | null;
  booked_at: string | null;
  pickup_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  rto_initiated_at: string | null;
  rto_delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  order?: Pick<
    Order,
    | 'id'
    | 'order_number'
    | 'checkout_reference'
    | 'customer_name'
    | 'customer_phone'
    | 'customer_email'
    | 'shipping_address'
    | 'payment_status'
    | 'order_status'
    | 'shipping'
    | 'final_amount'
    | 'total'
    | 'created_at'
  > | null;
};

export type ShipmentEventRecord = {
  id: string;
  shipment_id: string;
  provider: ShippingProviderName;
  provider_event_id: string | null;
  canonical_status: CanonicalShipmentStatus | null;
  raw_status: string | null;
  event_payload: Record<string, unknown>;
  provider_occurred_at: string | null;
  received_at: string;
  payload_hash: string | null;
};

export type ReadyToShipOrder = Pick<
  Order,
  | 'id'
  | 'order_number'
  | 'checkout_reference'
  | 'customer_name'
  | 'customer_phone'
  | 'customer_email'
  | 'shipping_address'
  | 'payment_status'
  | 'order_status'
  | 'fulfilment_status'
  | 'shipping'
  | 'final_amount'
  | 'total'
  | 'created_at'
> & {
  items?: Order['items'];
};

export type ShipmentCreationDraft = {
  orderId: string;
  provider: ShippingProviderName;
  packageDetails: PackageDetails;
  idempotencyKey: string;
  createdBy: string;
};

export type DestinationAddress = Pick<OrderAddress, 'pincode' | 'city' | 'state' | 'country'>;
