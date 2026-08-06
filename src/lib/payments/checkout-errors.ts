export type CheckoutStage =
  | 'request_validation'
  | 'profile_lookup'
  | 'provider_configuration'
  | 'idempotency_lookup'
  | 'product_lookup'
  | 'coupon_validation'
  | 'order_insert'
  | 'order_resume'
  | 'order_items_lookup'
  | 'order_items_insert'
  | 'stock_reservation'
  | 'payment_attempt_insert'
  | 'razorpay_order_creation'
  | 'payment_insert'
  | 'payment_attempt_update'
  | 'checkout_cleanup'
  | 'unhandled';

export type CheckoutPublicError =
  | 'order_database_error'
  | 'stock_reservation_failed'
  | 'razorpay_order_creation_failed'
  | 'checkout_in_progress'
  | 'idempotency_conflict';

export class RazorpayProviderError extends Error {
  readonly code: string;
  readonly description: string;
  readonly httpStatus: number;

  constructor({
    code,
    description,
    httpStatus = 502,
  }: {
    code: string;
    description: string;
    httpStatus?: number;
  }) {
    super(description);
    this.name = 'RazorpayProviderError';
    this.code = code;
    this.description = description;
    this.httpStatus = httpStatus;
  }
}

export class CheckoutProcessingError extends Error {
  readonly publicError: CheckoutPublicError;
  readonly stage: CheckoutStage;
  readonly status: number;
  readonly checkoutReference?: string;
  readonly causeValue: unknown;

  constructor({
    publicError,
    stage,
    cause,
    checkoutReference,
    status = 500,
  }: {
    publicError: CheckoutPublicError;
    stage: CheckoutStage;
    cause?: unknown;
    checkoutReference?: string;
    status?: number;
  }) {
    super(publicError);
    this.name = 'CheckoutProcessingError';
    this.publicError = publicError;
    this.stage = stage;
    this.status = status;
    this.checkoutReference = checkoutReference;
    this.causeValue = cause;
  }
}

type SupabaseErrorLike = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

function readSupabaseError(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const error = value as SupabaseErrorLike;
  if (typeof error.message !== 'string') return null;
  return {
    supabase_code: typeof error.code === 'string' ? error.code : null,
    supabase_message: error.message,
    supabase_details: typeof error.details === 'string' ? error.details : null,
    supabase_hint: typeof error.hint === 'string' ? error.hint : null,
  };
}

export function checkoutFailureLog(error: CheckoutProcessingError, requestId: string) {
  const supabase = readSupabaseError(error.causeValue);
  const razorpay =
    error.causeValue instanceof RazorpayProviderError
      ? {
          razorpay_code: error.causeValue.code,
          razorpay_description: error.causeValue.description,
        }
      : null;

  return {
    request_id: requestId,
    processing_stage: error.stage,
    checkout_reference: error.checkoutReference ?? null,
    ...(supabase ?? {}),
    ...(razorpay ?? {}),
  };
}
