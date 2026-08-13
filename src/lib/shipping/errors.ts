export const SHIPPING_ERROR_CODES = [
  'shipping_disabled',
  'shipping_not_configured',
  'provider_contract_missing',
  'invalid_destination',
  'destination_unserviceable',
  'package_details_required',
  'no_courier_available',
  'provider_auth_failed',
  'provider_rate_limited',
  'provider_unavailable',
  'shipment_already_exists',
  'shipment_creation_uncertain',
  'shipment_not_cancellable',
  'tracking_unavailable',
  'unpaid_order',
  'invalid_payment_provider',
] as const;

export type ShippingErrorCode = (typeof SHIPPING_ERROR_CODES)[number];

export class ShippingError extends Error {
  code: ShippingErrorCode;
  status: number;
  requestId?: string;
  safeDetails?: Record<string, unknown>;

  constructor({
    code,
    message,
    status = 400,
    requestId,
    safeDetails,
  }: {
    code: ShippingErrorCode;
    message: string;
    status?: number;
    requestId?: string;
    safeDetails?: Record<string, unknown>;
  }) {
    super(message);
    this.name = 'ShippingError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.safeDetails = safeDetails;
  }
}

export function toSafeShippingError(error: unknown, requestId: string) {
  if (error instanceof ShippingError) {
    return {
      error: error.code,
      message: error.message,
      request_id: error.requestId ?? requestId,
      details: error.safeDetails ?? undefined,
    };
  }

  console.error('[shipping] unhandled error', { requestId, error });
  return {
    error: 'provider_unavailable',
    message: 'Shipping operation could not be completed.',
    request_id: requestId,
  };
}
