import 'server-only';

import { randomUUID } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { badRequest, notFound } from '@/lib/api';
import { calculateOrderTotals, toPaise } from '@/lib/commerce/pricing';
import { validateRefundAmount } from '@/lib/commerce/refund-rules';
import { writeAdminAuditLog } from '@/lib/admin/audit';
import { serverEnv } from '@/lib/env.server';
import { assertExpectedPaymentAmount } from './payment-validation';
import {
  buildOrderItemRows,
  createCheckoutFingerprint,
  createCheckoutReference,
  createRazorpayReceipt,
  getCheckoutResumeDecision,
  getFailedCheckoutState,
  getPaymentAttemptDecision,
  getPreparedCheckoutState,
  getRazorpayConfigurationError,
  isPreparedProviderOrder,
  shouldCommitCheckoutInventory,
} from './checkout-preparation';
import {
  CheckoutProcessingError,
  RazorpayProviderError,
  type CheckoutPublicError,
  type CheckoutStage,
} from './checkout-errors';
import { MockPaymentProvider } from './mock-payment-provider';
import { RazorpayProvider } from './razorpay-provider';
import type { PaymentProvider } from './payment-provider';
import type { PaymentCurrency, ProviderPayment, WebhookValidationResult } from './types';
import type { CheckoutInput } from '@/lib/validators';
import type { OrderSuccessSummary, Product } from '@/types';

type OrderPaymentRow = {
  id: string;
  order_number: string | null;
  checkout_reference?: string | null;
  user_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  total: number;
  final_amount?: number | null;
  payment_status: string;
  order_status: string;
};

type PaymentRow = {
  id: string;
  order_id: string;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  amount_paise: number;
  currency: string;
  status: string;
  captured: boolean;
  refund_amount_paise: number;
};

type ValidateCouponRow = {
  ok: boolean;
  reason: string | null;
  coupon_id: string | null;
  coupon_code: string | null;
  discount: number | string | null;
};

type CheckoutProduct = Product & {
  reserved_stock?: number | null;
};

const PRODUCT_COLS =
  'id, slug, name, description, price, original_price, discount, images, category_id, tags, in_stock, stock_count, reserved_stock, rating, review_count, is_trending, is_new_arrival, is_best_seller, metadata, created_at, updated_at, category:categories(*)';

export function getPaymentProvider(): PaymentProvider {
  return serverEnv.PAYMENT_PROVIDER === 'razorpay'
    ? new RazorpayProvider()
    : new MockPaymentProvider();
}

function getOrderAmountPaise(order: OrderPaymentRow) {
  return toPaise(Number(order.final_amount ?? order.total ?? 0));
}

function getIdempotencyKey(key?: string) {
  return key?.trim() || `auto:${randomUUID()}`;
}

function getFinalOrderNumber(orderNumber: string | null | undefined) {
  return orderNumber && orderNumber.trim() ? orderNumber : null;
}

function checkoutError({
  publicError,
  stage,
  cause,
  checkoutReference,
  status,
}: {
  publicError: CheckoutPublicError;
  stage: CheckoutStage;
  cause?: unknown;
  checkoutReference?: string;
  status?: number;
}) {
  return new CheckoutProcessingError({
    publicError,
    stage,
    cause,
    checkoutReference,
    status,
  });
}

function databaseError(stage: CheckoutStage, cause: unknown, checkoutReference?: string) {
  return checkoutError({
    publicError: 'order_database_error',
    stage,
    cause,
    checkoutReference,
  });
}

function buildOrderSuccessSummary(order: Record<string, unknown>): OrderSuccessSummary {
  return {
    id: String(order.id),
    order_number: String(order.order_number),
    customer_name: String(order.customer_name),
    total: Number(order.final_amount ?? order.total ?? 0),
    payment_method: 'razorpay',
    payment_status: 'captured',
    order_status: 'placed',
    created_at: String(order.created_at),
  };
}

async function releaseReservationForOrder(orderId: string, reason: string) {
  const supabase = createServiceClient();
  const { error } = await supabase.rpc('release_order_reservation', {
    p_order_id: orderId,
    p_reason: reason,
  });
  if (error) throw error;
}

async function ensureOrderReservation(orderId: string) {
  const supabase = createServiceClient();
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, stock_reserved_until, reservation_released_at, items:order_items(product_id, quantity)'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) throw orderError;
  if (!order) throw notFound('Order not found');
  const items = (order.items ?? []) as { product_id: string; quantity: number }[];
  if (!items.length) throw badRequest('Checkout has no order items', 'order_items_missing');
  const reservationIsActive =
    order.stock_reserved_until &&
    new Date(order.stock_reserved_until).getTime() > Date.now() &&
    !order.reservation_released_at;
  if (reservationIsActive) return;

  if (order.stock_reserved_until && !order.reservation_released_at) {
    await releaseReservationForOrder(orderId, 'Expired checkout reservation replaced');
  }

  for (const item of items) {
    const { error: reserveError } = await supabase.rpc('reserve_product_stock', {
      p_product_id: item.product_id,
      p_order_id: orderId,
      p_quantity: item.quantity,
      p_reason: 'Retry payment stock reservation',
    });
    if (reserveError) throw reserveError;
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      stock_reserved_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      reservation_released_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  if (updateError) throw updateError;
}

async function getOrCreateFinalOrderNumber(orderId: string, existingOrderNumber?: string | null) {
  const current = getFinalOrderNumber(existingOrderNumber);
  if (current) return current;

  const supabase = createServiceClient();
  const { data: generated, error } = await supabase.rpc('generate_gridaan_order_number');
  if (error || !generated) throw error ?? new Error('Could not generate order number');
  const orderNumber = String(generated);

  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update({ order_number: orderNumber, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .is('order_number', null)
    .select('order_number')
    .maybeSingle();

  if (updateError) throw updateError;
  if (updatedOrder?.order_number) return String(updatedOrder.order_number);

  const { data: existingOrder, error: lookupError } = await supabase
    .from('orders')
    .select('order_number')
    .eq('id', orderId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  const assigned = getFinalOrderNumber(existingOrder?.order_number);
  if (!assigned) throw new Error('Could not assign order number');
  return assigned;
}

export async function createOnlineCheckout({
  input,
  profileId,
  idempotencyKey,
}: {
  input: CheckoutInput;
  profileId?: string | null;
  idempotencyKey?: string;
}) {
  if (input.payment_method !== 'razorpay') {
    throw badRequest('Only Razorpay online payment is available', 'online_payment_only');
  }

  const supabase = createServiceClient();
  const provider = getPaymentProvider();
  const key = getIdempotencyKey(idempotencyKey);
  const checkoutReference = createCheckoutReference(key);
  const checkoutFingerprint = createCheckoutFingerprint(input, profileId);
  const configurationError = getRazorpayConfigurationError({
    provider: serverEnv.PAYMENT_PROVIDER,
    publicKeyId: serverEnv.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    serverKeyId: serverEnv.RAZORPAY_KEY_ID,
    serverKeySecret: serverEnv.RAZORPAY_KEY_SECRET,
  });

  if (configurationError) {
    throw checkoutError({
      publicError: 'razorpay_order_creation_failed',
      stage: 'provider_configuration',
      checkoutReference,
      cause: new RazorpayProviderError({
        code: configurationError,
        description: 'Razorpay checkout configuration is incomplete or inconsistent',
        httpStatus: 500,
      }),
      status: 500,
    });
  }

  const { data: existingAttempt, error: existingAttemptError } = await supabase
    .from('payment_attempts')
    .select('*, payment:payments(*), order:orders(*)')
    .eq('provider', provider.name)
    .eq('idempotency_key', key)
    .maybeSingle();

  if (existingAttemptError) {
    throw databaseError('idempotency_lookup', existingAttemptError, checkoutReference);
  }
  const ids = input.items.map((item) => item.product_id);
  const { data: products, error: productError } = await supabase
    .from('products')
    .select(PRODUCT_COLS)
    .in('id', ids);

  if (productError) throw databaseError('product_lookup', productError, checkoutReference);
  if (!products || products.length !== ids.length) throw notFound('Some products are unavailable');

  const byId = new Map(
    (products as unknown as CheckoutProduct[]).map((product) => [product.id, product])
  );
  for (const item of input.items) {
    const product = byId.get(item.product_id);
    if (!product) throw notFound(`Product ${item.product_id} not found`);
    const availableStock = Number(product.stock_count ?? 0) - Number(product.reserved_stock ?? 0);
    if (!product.in_stock || availableStock < item.quantity) {
      throw badRequest(`"${product.name}" is out of stock`, 'out_of_stock');
    }
  }

  let coupon: {
    id: string | null;
    code: string | null;
    discount: number;
  } = { id: null, code: null, discount: 0 };

  const pricingItems = input.items.map((item) => {
    const product = byId.get(item.product_id)!;
    return {
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: Number(product.price),
    };
  });
  const subtotalForCoupon = pricingItems.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );

  if (input.coupon_code) {
    const { data: couponData, error: couponError } = await supabase.rpc('validate_coupon', {
      p_code: input.coupon_code,
      p_subtotal: subtotalForCoupon,
    });
    if (couponError) throw databaseError('coupon_validation', couponError, checkoutReference);
    const row = ((couponData ?? []) as ValidateCouponRow[])[0];
    if (!row?.ok) {
      throw badRequest(row?.reason ?? 'Coupon is not valid', 'invalid_coupon');
    }
    coupon = {
      id: row.coupon_id,
      code: row.coupon_code,
      discount: Number(row.discount ?? 0),
    };
  }

  const totals = calculateOrderTotals({
    items: pricingItems,
    coupon: coupon.code
      ? {
          code: coupon.code,
          type: 'fixed',
          value: coupon.discount,
        }
      : null,
  });
  const orderValues = {
    user_id: profileId ?? null,
    customer_name: input.customer_name,
    customer_email: input.customer_email || null,
    customer_phone: input.customer_phone,
    shipping_address: input.shipping_address,
    billing_address: input.shipping_address,
    subtotal: totals.subtotal,
    discount: totals.discount,
    shipping: totals.shipping,
    tax: totals.tax,
    total: totals.total,
    gross_amount: totals.subtotal,
    final_amount: totals.total,
    coupon_id: coupon.id,
    coupon_code: coupon.code,
    payment_method: 'razorpay' as const,
    fulfilment_status: 'unfulfilled',
    notes: input.notes || null,
    customer_notes: input.notes || null,
  };

  let order = existingAttempt?.order as Record<string, unknown> | null | undefined;
  if (!order) {
    const { data: existingOrder, error: existingOrderError } = await supabase
      .from('orders')
      .select('*')
      .eq('checkout_reference', checkoutReference)
      .maybeSingle();
    if (existingOrderError) {
      throw databaseError('idempotency_lookup', existingOrderError, checkoutReference);
    }
    order = existingOrder;
  }

  if (order) {
    const metadata = (order.metadata ?? {}) as Record<string, unknown>;
    if (metadata.checkout_fingerprint && metadata.checkout_fingerprint !== checkoutFingerprint) {
      throw checkoutError({
        publicError: 'idempotency_conflict',
        stage: 'order_resume',
        checkoutReference,
        status: 409,
      });
    }
    const resumeDecision = getCheckoutResumeDecision({
      orderStatus: String(order.order_status ?? ''),
      paymentStatus: String(order.payment_status ?? ''),
    });
    if (resumeDecision === 'not_payable') {
      throw badRequest('This checkout has already been placed', 'order_not_payable');
    }
    if (resumeDecision === 'in_progress') {
      throw checkoutError({
        publicError: 'checkout_in_progress',
        stage: 'order_resume',
        checkoutReference,
        status: 409,
      });
    }

    const { data: claimedOrder, error: claimError } = await supabase
      .from('orders')
      .update({
        ...orderValues,
        payment_status: 'pending',
        order_status: 'payment_processing',
        payment_failure_reason: null,
        metadata: {
          ...metadata,
          checkout_reference: checkoutReference,
          checkout_fingerprint: checkoutFingerprint,
          online_payment_only: true,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', String(order.id))
      .in('order_status', ['pending_payment', 'cancelled', 'draft'])
      .select('*')
      .maybeSingle();

    if (claimError) throw databaseError('order_resume', claimError, checkoutReference);
    if (!claimedOrder) {
      throw checkoutError({
        publicError: 'checkout_in_progress',
        stage: 'order_resume',
        checkoutReference,
        status: 409,
      });
    }
    order = claimedOrder;
  } else {
    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        ...orderValues,
        order_number: null,
        checkout_reference: checkoutReference,
        payment_status: 'pending',
        order_status: 'payment_processing',
        stock_reserved_until: null,
        metadata: {
          checkout_reference: checkoutReference,
          checkout_fingerprint: checkoutFingerprint,
          online_payment_only: true,
        },
      })
      .select('*')
      .single();

    if (orderError?.code === '23505') {
      throw checkoutError({
        publicError: 'checkout_in_progress',
        stage: 'order_insert',
        cause: orderError,
        checkoutReference,
        status: 409,
      });
    }
    if (orderError) throw databaseError('order_insert', orderError, checkoutReference);
    order = insertedOrder;
  }

  if (!order?.id) {
    throw databaseError(
      'order_insert',
      new Error('Order insert returned no ID'),
      checkoutReference
    );
  }

  const orderId = String(order.id);

  try {
    const { data: existingItems, error: existingItemsError } = await supabase
      .from('order_items')
      .select('id, product_id, quantity')
      .eq('order_id', orderId);
    if (existingItemsError) {
      throw databaseError('order_items_lookup', existingItemsError, checkoutReference);
    }

    if (existingItems?.length) {
      const expected = new Map(input.items.map((item) => [item.product_id, item.quantity]));
      const matches =
        existingItems.length === expected.size &&
        existingItems.every(
          (item) => expected.get(String(item.product_id)) === Number(item.quantity)
        );
      if (!matches) {
        throw checkoutError({
          publicError: 'idempotency_conflict',
          stage: 'order_items_lookup',
          checkoutReference,
          status: 409,
        });
      }
    } else {
      const itemRows = buildOrderItemRows({
        orderId,
        items: input.items,
        productsById: byId,
      });
      const { error: itemError } = await supabase.from('order_items').insert(itemRows);
      if (itemError) {
        throw databaseError('order_items_insert', itemError, checkoutReference);
      }
    }

    try {
      await ensureOrderReservation(orderId);
    } catch (error) {
      throw checkoutError({
        publicError: 'stock_reservation_failed',
        stage: 'stock_reservation',
        cause: error,
        checkoutReference,
        status: 409,
      });
    }

    const paymentResult = await createPaymentOrderForOrder({
      orderId,
      idempotencyKey: key,
      checkoutReference,
    });

    return {
      order,
      checkout_reference: checkoutReference,
      ...paymentResult,
    };
  } catch (error) {
    const failure =
      error instanceof CheckoutProcessingError
        ? error
        : databaseError('unhandled', error, checkoutReference);

    try {
      await releaseReservationForOrder(orderId, 'Checkout preparation failed');
    } catch (releaseError) {
      throw databaseError('checkout_cleanup', releaseError, checkoutReference);
    }

    const { error: cleanupError } = await supabase
      .from('orders')
      .update({
        ...getFailedCheckoutState(failure.publicError),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
    if (cleanupError) throw databaseError('checkout_cleanup', cleanupError, checkoutReference);
    throw failure;
  }
}

export async function createPaymentOrderForOrder({
  orderId,
  idempotencyKey,
  checkoutReference: suppliedCheckoutReference,
}: {
  orderId: string;
  idempotencyKey?: string;
  checkoutReference?: string;
}) {
  const supabase = createServiceClient();
  const provider = getPaymentProvider();
  const key = getIdempotencyKey(idempotencyKey);

  const { data: existingAttempt, error: existingAttemptError } = await supabase
    .from('payment_attempts')
    .select('*, payment:payments(*)')
    .eq('provider', provider.name)
    .eq('idempotency_key', key)
    .maybeSingle();

  if (existingAttemptError) {
    throw databaseError('idempotency_lookup', existingAttemptError, suppliedCheckoutReference);
  }
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, order_number, checkout_reference, user_id, customer_name, customer_email, customer_phone, total, final_amount, payment_status, order_status'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) {
    throw databaseError('order_resume', orderError, suppliedCheckoutReference);
  }
  if (!order) throw notFound('Order not found');

  const typedOrder = order as OrderPaymentRow;
  const checkoutReference =
    suppliedCheckoutReference ?? typedOrder.checkout_reference ?? createCheckoutReference(key);
  if (['paid', 'captured', 'refunded'].includes(typedOrder.payment_status)) {
    throw badRequest('Order is not payable', 'order_not_payable');
  }

  const amountPaise = getOrderAmountPaise(typedOrder);
  if (amountPaise <= 0) throw badRequest('Order amount must be greater than zero');
  const receipt = createRazorpayReceipt(checkoutReference, key);
  try {
    await ensureOrderReservation(typedOrder.id);
  } catch (error) {
    throw checkoutError({
      publicError: 'stock_reservation_failed',
      stage: 'stock_reservation',
      cause: error,
      checkoutReference,
      status: 409,
    });
  }

  if (existingAttempt?.payment && isPreparedProviderOrder(existingAttempt.response_payload)) {
    return {
      reused: true,
      payment: (existingAttempt as { payment?: unknown }).payment,
      attempt: existingAttempt,
      provider_order: existingAttempt.response_payload,
      integration_pending: existingAttempt.response_payload.integrationPending,
    };
  }

  let attempt = existingAttempt as Record<string, unknown> | null;
  if (attempt && !isPreparedProviderOrder(attempt.response_payload)) {
    const attemptDecision = getPaymentAttemptDecision({
      status: String(attempt.status ?? ''),
      hasProviderOrder: false,
      hasPayment: Boolean(attempt.payment),
    });
    if (attemptDecision === 'in_progress') {
      throw checkoutError({
        publicError: 'checkout_in_progress',
        stage: 'payment_attempt_insert',
        checkoutReference,
        status: 409,
      });
    }

    const { data: claimedAttempt, error: claimError } = await supabase
      .from('payment_attempts')
      .update({
        status: 'pending',
        error_code: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', String(attempt.id))
      .eq('status', 'failed')
      .select('*')
      .maybeSingle();
    if (claimError) {
      throw databaseError('payment_attempt_update', claimError, checkoutReference);
    }
    if (!claimedAttempt) {
      throw checkoutError({
        publicError: 'checkout_in_progress',
        stage: 'payment_attempt_update',
        checkoutReference,
        status: 409,
      });
    }
    attempt = claimedAttempt;
  }

  if (!attempt) {
    const { data: insertedAttempt, error: attemptError } = await supabase
      .from('payment_attempts')
      .insert({
        order_id: typedOrder.id,
        provider: provider.name,
        idempotency_key: key,
        amount_paise: amountPaise,
        currency: 'INR',
        status: 'pending',
        request_payload: {
          order_id: typedOrder.id,
          receipt,
        },
        response_payload: {},
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      })
      .select('*')
      .single();

    if (attemptError?.code === '23505') {
      throw checkoutError({
        publicError: 'checkout_in_progress',
        stage: 'payment_attempt_insert',
        cause: attemptError,
        checkoutReference,
        status: 409,
      });
    }
    if (attemptError) {
      throw databaseError('payment_attempt_insert', attemptError, checkoutReference);
    }
    if (!insertedAttempt) {
      throw databaseError(
        'payment_attempt_insert',
        new Error('Payment attempt insert returned no row'),
        checkoutReference
      );
    }
    attempt = insertedAttempt;
  }

  if (!attempt) {
    throw databaseError(
      'payment_attempt_insert',
      new Error('Payment attempt is unavailable'),
      checkoutReference
    );
  }

  let providerOrder = isPreparedProviderOrder(attempt.response_payload)
    ? attempt.response_payload
    : null;

  if (!providerOrder) {
    try {
      providerOrder = await provider.createOrder({
        internalOrderId: typedOrder.id,
        receipt,
        amountPaise,
        currency: 'INR',
        idempotencyKey: key,
        notes: {
          checkout_reference: checkoutReference,
          ...(typedOrder.order_number ? { order_number: typedOrder.order_number } : {}),
        },
      });
      assertExpectedPaymentAmount({
        expectedPaise: amountPaise,
        actualPaise: providerOrder.amountPaise,
        expectedCurrency: 'INR',
        actualCurrency: providerOrder.currency,
      });
    } catch (error) {
      await supabase
        .from('payment_attempts')
        .update({
          status: 'failed',
          error_code:
            error instanceof RazorpayProviderError
              ? error.code
              : 'razorpay_order_validation_failed',
          error_message: 'Razorpay order creation failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', String(attempt.id));
      throw checkoutError({
        publicError: 'razorpay_order_creation_failed',
        stage: 'razorpay_order_creation',
        cause: error,
        checkoutReference,
        status: 502,
      });
    }

    const { data: updatedAttempt, error: attemptUpdateError } = await supabase
      .from('payment_attempts')
      .update({
        gateway_order_id: providerOrder.gatewayOrderId,
        status: providerOrder.status,
        response_payload: providerOrder,
        updated_at: new Date().toISOString(),
      })
      .eq('id', String(attempt.id))
      .select('*')
      .single();
    if (attemptUpdateError) {
      throw databaseError('payment_attempt_update', attemptUpdateError, checkoutReference);
    }
    if (!updatedAttempt) {
      throw databaseError(
        'payment_attempt_update',
        new Error('Payment attempt update returned no row'),
        checkoutReference
      );
    }
    attempt = updatedAttempt;
  }

  if (!attempt) {
    throw databaseError(
      'payment_attempt_update',
      new Error('Payment attempt is unavailable after provider initialization'),
      checkoutReference
    );
  }
  const paymentAttempt = attempt;

  let payment = (paymentAttempt.payment ?? null) as Record<string, unknown> | null;
  if (!payment) {
    const { data: existingPayment, error: existingPaymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', typedOrder.id)
      .eq('gateway_order_id', providerOrder.gatewayOrderId)
      .maybeSingle();
    if (existingPaymentError) {
      throw databaseError('payment_insert', existingPaymentError, checkoutReference);
    }
    payment = existingPayment;
  }

  if (!payment) {
    const { data: insertedPayment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: typedOrder.id,
        provider: provider.name,
        gateway: 'razorpay',
        gateway_order_id: providerOrder.gatewayOrderId,
        amount_paise: amountPaise,
        currency: providerOrder.currency,
        status: providerOrder.status,
        captured: false,
        metadata: providerOrder.metadata,
      })
      .select('*')
      .single();

    if (paymentError) {
      await supabase
        .from('payment_attempts')
        .update({
          status: 'failed',
          error_code: paymentError.code,
          error_message: 'Payment record creation failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', String(paymentAttempt.id));
      throw databaseError('payment_insert', paymentError, checkoutReference);
    }
    if (!insertedPayment) {
      throw databaseError(
        'payment_insert',
        new Error('Payment insert returned no row'),
        checkoutReference
      );
    }
    payment = insertedPayment;
  }

  if (!payment) {
    throw databaseError(
      'payment_insert',
      new Error('Payment record is unavailable'),
      checkoutReference
    );
  }

  const { data: linkedAttempt, error: linkAttemptError } = await supabase
    .from('payment_attempts')
    .update({
      payment_id: payment.id,
      gateway_order_id: providerOrder.gatewayOrderId,
      status: providerOrder.status,
      response_payload: providerOrder,
      error_code: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', String(paymentAttempt.id))
    .select('*')
    .single();
  if (linkAttemptError) {
    throw databaseError('payment_attempt_update', linkAttemptError, checkoutReference);
  }
  attempt = linkedAttempt;

  const { error: orderUpdateError } = await supabase
    .from('orders')
    .update({
      ...getPreparedCheckoutState(new Date(Date.now() + 15 * 60 * 1000).toISOString()),
      updated_at: new Date().toISOString(),
    })
    .eq('id', typedOrder.id);
  if (orderUpdateError) {
    throw databaseError('order_resume', orderUpdateError, checkoutReference);
  }

  return {
    reused: false,
    payment,
    attempt,
    provider_order: providerOrder,
    integration_pending: providerOrder.integrationPending,
  };
}

export async function verifyPaymentCallback({
  orderId,
  gatewayOrderId,
  gatewayPaymentId,
  signature,
}: {
  orderId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  signature: string;
}) {
  const supabase = createServiceClient();
  const provider = getPaymentProvider();
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, order_number, checkout_reference, total, final_amount, payment_status, order_status'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) throw orderError;
  if (!order) throw notFound('Order not found');

  const typedOrder = order as OrderPaymentRow;
  const amountPaise = getOrderAmountPaise(typedOrder);

  const { data: existingPayment, error: existingPaymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .eq('gateway_order_id', gatewayOrderId)
    .maybeSingle();

  if (existingPaymentError) throw existingPaymentError;
  if (!existingPayment) throw notFound('Payment record not found');
  assertExpectedPaymentAmount({
    expectedPaise: Number(existingPayment.amount_paise),
    actualPaise: amountPaise,
    expectedCurrency: String(existingPayment.currency).toUpperCase(),
    actualCurrency: 'INR',
  });

  const verified = await provider.verifyPayment({
    internalOrderId: typedOrder.id,
    gatewayOrderId,
    gatewayPaymentId,
    signature,
    expectedAmountPaise: amountPaise,
    currency: 'INR',
  });

  if (!verified.verified) {
    await markPaymentAttemptFailed({
      orderId,
      gatewayOrderId,
      gatewayPaymentId,
      errorCode: 'invalid_signature',
      errorMessage: 'Razorpay signature verification failed',
      releaseReservation: true,
    });
    throw badRequest('Invalid Razorpay signature', 'invalid_signature');
  }

  const providerPayment = await provider.getPayment(gatewayPaymentId);
  if (providerPayment.gatewayOrderId && providerPayment.gatewayOrderId !== gatewayOrderId) {
    throw badRequest('Razorpay order ID mismatch', 'razorpay_order_mismatch');
  }
  assertExpectedPaymentAmount({
    expectedPaise: Number(existingPayment.amount_paise),
    actualPaise: providerPayment.amountPaise,
    expectedCurrency: String(existingPayment.currency).toUpperCase(),
    actualCurrency: providerPayment.currency.toUpperCase(),
  });

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .update({
      gateway_payment_id: gatewayPaymentId,
      method: providerPayment.method,
      status: providerPayment.status,
      captured: providerPayment.captured,
      captured_at:
        providerPayment.capturedAt ?? (providerPayment.captured ? new Date().toISOString() : null),
      metadata: {
        ...verified.metadata,
        provider_payment: providerPayment.metadata,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', orderId)
    .eq('gateway_order_id', gatewayOrderId)
    .select('*')
    .maybeSingle();

  if (paymentError) throw paymentError;

  await supabase
    .from('payment_attempts')
    .update({
      status: providerPayment.status,
      response_payload: {
        frontend_verified: true,
        provider_payment: providerPayment,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('payment_id', existingPayment.id)
    .eq('gateway_order_id', gatewayOrderId);

  if (providerPayment.captured) {
    const orderSummary = await finalizeCapturedPayment({
      paymentId: existingPayment.id,
      providerPayment,
      source: 'server_payment_lookup_after_signature',
    });
    return {
      verified,
      payment,
      order: orderSummary,
      placed: true,
      message: 'Payment captured by Razorpay and order placed.',
    };
  }

  return {
    verified,
    payment,
    placed: false,
    message:
      'Payment signature verified, but Razorpay payment is not captured yet. Order remains pending.',
  };
}

export async function finalizeCapturedPayment({
  paymentId,
  providerPayment,
  source,
}: {
  paymentId: string;
  providerPayment: ProviderPayment;
  source: string;
}) {
  const supabase = createServiceClient();
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*, order:orders(*, items:order_items(*))')
    .eq('id', paymentId)
    .maybeSingle();

  if (paymentError) throw paymentError;
  if (!payment) throw notFound('Payment not found');

  const typedPayment = payment as PaymentRow & { order?: Record<string, unknown> | null };
  if (!typedPayment.order) throw notFound('Order not found for payment');

  assertExpectedPaymentAmount({
    expectedPaise: Number(typedPayment.amount_paise),
    actualPaise: providerPayment.amountPaise,
    expectedCurrency: String(typedPayment.currency).toUpperCase(),
    actualCurrency: providerPayment.currency.toUpperCase(),
  });

  if (!providerPayment.captured) {
    throw badRequest('Payment is not captured', 'payment_not_captured');
  }

  if (
    typedPayment.order.payment_status === 'captured' &&
    typedPayment.order.order_status === 'placed'
  ) {
    return buildOrderSuccessSummary(typedPayment.order);
  }

  const orderId = String(typedPayment.order_id);
  const isOrderPaidWebhookReference = providerPayment.gatewayPaymentId.startsWith('order_paid:');
  const gatewayPaymentId = isOrderPaidWebhookReference
    ? typedPayment.gateway_payment_id
    : providerPayment.gatewayPaymentId;
  const now = new Date().toISOString();

  const { data: updatedPayment, error: updatePaymentError } = await supabase
    .from('payments')
    .update({
      gateway_payment_id: gatewayPaymentId,
      method: providerPayment.method,
      status: 'captured',
      captured: true,
      captured_at: providerPayment.capturedAt ?? now,
      metadata: {
        ...(typedPayment as { metadata?: Record<string, unknown> }).metadata,
        source,
        provider_payment: providerPayment.metadata,
      },
      updated_at: now,
    })
    .eq('id', paymentId)
    .select('*')
    .maybeSingle();
  if (updatePaymentError) throw updatePaymentError;
  if (!updatedPayment) throw notFound('Payment not found after capture update');

  if (
    shouldCommitCheckoutInventory({
      paymentCaptured: providerPayment.captured,
      inventoryCommittedAt: typedPayment.order.inventory_committed_at as string | null,
    })
  ) {
    const { error: commitError } = await supabase.rpc('commit_order_inventory', {
      p_order_id: orderId,
      p_reason: `Captured online payment (${source})`,
    });
    if (commitError) throw commitError;
  }

  const orderNumber = await getOrCreateFinalOrderNumber(
    orderId,
    typedPayment.order.order_number as string | null
  );

  await supabase
    .from('payment_attempts')
    .update({
      status: 'captured',
      response_payload: {
        source,
        provider_payment: providerPayment,
      },
      updated_at: now,
    })
    .eq('payment_id', paymentId);

  const { data: updatedOrder, error: updateOrderError } = await supabase
    .from('orders')
    .update({
      order_number: orderNumber,
      payment_status: 'captured',
      order_status: 'placed',
      razorpay_order_id: providerPayment.gatewayOrderId ?? typedPayment.gateway_order_id,
      razorpay_payment_id: gatewayPaymentId,
      razorpay_signature: null,
      inventory_committed_at: now,
      finalised_at: now,
      stock_reserved_until: null,
      reservation_released_at: null,
      payment_failure_reason: null,
      updated_at: now,
    })
    .eq('id', orderId)
    .select('*')
    .maybeSingle();

  if (updateOrderError) throw updateOrderError;
  if (!updatedOrder) throw notFound('Order not found after payment capture');

  await supabase
    .from('order_status_history')
    .insert({
      order_id: orderId,
      from_status: typedPayment.order.order_status ?? 'pending_payment',
      to_status: 'placed',
      note: `Order placed after verified captured Razorpay payment (${source})`,
    })
    .then(({ error }) => {
      if (error) console.warn('[payments] status history insert failed', error.message);
    });

  console.info('[payments] captured payment finalized order', {
    paymentId,
    orderId,
    orderNumber,
    gatewayOrderId: providerPayment.gatewayOrderId ?? typedPayment.gateway_order_id,
    gatewayPaymentId,
    source,
  });

  return buildOrderSuccessSummary({
    ...updatedOrder,
    payment_status: updatedPayment?.status ?? 'captured',
    order_status: 'placed',
  });
}

export async function markPaymentAttemptFailed({
  orderId,
  paymentId,
  gatewayOrderId,
  gatewayPaymentId,
  errorCode,
  errorMessage,
  releaseReservation = false,
}: {
  orderId: string;
  paymentId?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  errorCode: string;
  errorMessage: string;
  releaseReservation?: boolean;
}) {
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  let paymentQuery = supabase.from('payments').select('*').eq('order_id', orderId);
  if (paymentId) paymentQuery = paymentQuery.eq('id', paymentId);
  if (gatewayOrderId) paymentQuery = paymentQuery.eq('gateway_order_id', gatewayOrderId);

  const { data: payment, error: paymentError } = await paymentQuery.order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (paymentError) throw paymentError;

  if (payment) {
    await supabase
      .from('payments')
      .update({
        gateway_payment_id: gatewayPaymentId ?? payment.gateway_payment_id,
        status: 'failed',
        captured: false,
        failure_code: errorCode,
        failure_reason: errorMessage,
        updated_at: now,
      })
      .eq('id', payment.id);

    await supabase
      .from('payment_attempts')
      .update({
        status: 'failed',
        error_code: errorCode,
        error_message: errorMessage,
        updated_at: now,
      })
      .eq('payment_id', payment.id);
  }

  if (releaseReservation) {
    await releaseReservationForOrder(orderId, errorMessage);
  }

  await supabase
    .from('orders')
    .update({
      payment_status: 'failed',
      order_status: 'pending_payment',
      payment_failure_reason: errorMessage,
      updated_at: now,
    })
    .eq('id', orderId)
    .in('payment_status', ['pending', 'authorised', 'failed']);

  console.info('[payments] payment attempt failed', {
    orderId,
    paymentId: payment?.id ?? paymentId ?? null,
    gatewayOrderId: gatewayOrderId ?? payment?.gateway_order_id ?? null,
    errorCode,
    releaseReservation,
  });

  return { ok: true, payment_id: payment?.id ?? paymentId ?? null };
}

function readWebhookPayment(payload: Record<string, unknown>) {
  const nestedPayment = (payload.payload as Record<string, unknown> | undefined)?.payment as
    | Record<string, unknown>
    | undefined;
  const entity = (nestedPayment?.entity as Record<string, unknown> | undefined) ?? payload;
  const notes = (entity.notes as Record<string, unknown> | undefined) ?? {};

  return {
    gatewayPaymentId: String(entity.id ?? payload.payment_id ?? ''),
    gatewayOrderId: String(entity.order_id ?? payload.order_id ?? ''),
    amountPaise: Number(entity.amount ?? payload.amount_paise ?? 0),
    currency: String(entity.currency ?? payload.currency ?? 'INR') as PaymentCurrency,
    method: entity.method ? String(entity.method) : undefined,
    captured: Boolean(entity.captured) || String(entity.status ?? '') === 'captured',
    checkoutReference: notes.checkout_reference ? String(notes.checkout_reference) : undefined,
  };
}

function readWebhookOrder(payload: Record<string, unknown>) {
  const nestedOrder = (payload.payload as Record<string, unknown> | undefined)?.order as
    | Record<string, unknown>
    | undefined;
  const entity = (nestedOrder?.entity as Record<string, unknown> | undefined) ?? payload;
  const notes = (entity.notes as Record<string, unknown> | undefined) ?? {};

  return {
    gatewayOrderId: String(entity.id ?? payload.order_id ?? ''),
    amountPaise: Number(entity.amount ?? payload.amount_paise ?? 0),
    amountPaidPaise: Number(entity.amount_paid ?? entity.amount ?? payload.amount_paise ?? 0),
    currency: String(entity.currency ?? payload.currency ?? 'INR') as PaymentCurrency,
    checkoutReference: notes.checkout_reference ? String(notes.checkout_reference) : undefined,
  };
}

export async function recordWebhookEvent({
  rawBody,
  signature,
  eventId,
}: {
  rawBody: string;
  signature: string | null;
  eventId?: string | null;
}) {
  const supabase = createServiceClient();
  const provider = getPaymentProvider();
  const validation: WebhookValidationResult = await provider.validateWebhook(rawBody, signature, { eventId });

  if (!validation.valid) {
    throw badRequest('Invalid webhook signature', 'invalid_webhook_signature');
  }

  const { data: inserted, error: insertError } = await supabase
    .from('payment_webhook_events')
    .insert({
      provider: provider.name,
      event_id: validation.eventId,
      event_type: validation.eventType,
      payload_hash: validation.payloadHash,
      payload: validation.payload,
    })
    .select('*')
    .maybeSingle();

  if (insertError) {
    if (insertError.code === '23505') {
      return { duplicate: true, processed: false, event: null };
    }
    throw insertError;
  }

  if (!inserted) return { duplicate: true, processed: false, event: null };

  try {
    if (validation.eventType === 'payment.captured' || validation.eventType === 'payment.authorized' || validation.eventType === 'payment.failed') {
      const paymentData = readWebhookPayment(validation.payload);
      const nextStatus =
        validation.eventType === 'payment.captured'
          ? 'captured'
          : validation.eventType === 'payment.failed'
            ? 'failed'
            : 'authorised';
      const captured = validation.eventType === 'payment.captured';

      const { data: existingPayment, error: paymentLookupError } = await supabase
        .from('payments')
        .select('id, order_id, amount_paise, currency, gateway_order_id, order:orders(checkout_reference)')
        .eq('provider', provider.name)
        .eq('gateway_order_id', paymentData.gatewayOrderId)
        .maybeSingle();

      if (paymentLookupError) throw paymentLookupError;
      if (!existingPayment) throw notFound('Payment not found for webhook');

      assertExpectedPaymentAmount({
        expectedPaise: Number(existingPayment.amount_paise),
        actualPaise: paymentData.amountPaise,
        expectedCurrency: String(existingPayment.currency).toUpperCase(),
        actualCurrency: paymentData.currency.toUpperCase(),
      });
      const checkoutReference = (existingPayment as { order?: { checkout_reference?: string | null } | null }).order?.checkout_reference;
      if (paymentData.checkoutReference && checkoutReference && paymentData.checkoutReference !== checkoutReference) {
        throw badRequest('Webhook checkout reference mismatch', 'webhook_checkout_reference_mismatch');
      }

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .update({
          gateway_payment_id: paymentData.gatewayPaymentId || undefined,
          method: paymentData.method,
          status: nextStatus,
          captured,
          captured_at: captured ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPayment.id)
        .select('*')
        .maybeSingle();

      if (paymentError) throw paymentError;

      if (payment && captured) {
        await finalizeCapturedPayment({
          paymentId: existingPayment.id,
          providerPayment: {
            provider: provider.name,
            gatewayPaymentId: paymentData.gatewayPaymentId,
            gatewayOrderId: paymentData.gatewayOrderId,
            amountPaise: paymentData.amountPaise,
            currency: paymentData.currency,
            method: paymentData.method,
            status: 'captured',
            captured: true,
            capturedAt: new Date().toISOString(),
            metadata: {
              webhook_event_id: validation.eventId,
              webhook_event_type: validation.eventType,
            },
          },
          source: `webhook:${validation.eventType}`,
        });
      }

      if (validation.eventType === 'payment.failed') {
        await markPaymentAttemptFailed({
          orderId: existingPayment.order_id,
          paymentId: existingPayment.id,
          gatewayOrderId: paymentData.gatewayOrderId,
          gatewayPaymentId: paymentData.gatewayPaymentId,
          errorCode: 'razorpay_payment_failed',
          errorMessage: 'Razorpay payment failed webhook received',
          releaseReservation: true,
        });
      }
    }

    if (validation.eventType === 'order.paid') {
      const orderData = readWebhookOrder(validation.payload);
      const { data: existingPayment, error: paymentLookupError } = await supabase
        .from('payments')
        .select('id, order_id, amount_paise, currency, gateway_payment_id, gateway_order_id, order:orders(checkout_reference)')
        .eq('provider', provider.name)
        .eq('gateway_order_id', orderData.gatewayOrderId)
        .maybeSingle();

      if (paymentLookupError) throw paymentLookupError;
      if (!existingPayment) throw notFound('Payment not found for order.paid webhook');

      assertExpectedPaymentAmount({
        expectedPaise: Number(existingPayment.amount_paise),
        actualPaise: orderData.amountPaidPaise,
        expectedCurrency: String(existingPayment.currency).toUpperCase(),
        actualCurrency: orderData.currency.toUpperCase(),
      });
      const checkoutReference = (existingPayment as { order?: { checkout_reference?: string | null } | null }).order?.checkout_reference;
      if (orderData.checkoutReference && checkoutReference && orderData.checkoutReference !== checkoutReference) {
        throw badRequest('Webhook checkout reference mismatch', 'webhook_checkout_reference_mismatch');
      }

      await finalizeCapturedPayment({
        paymentId: existingPayment.id,
        providerPayment: {
          provider: provider.name,
          gatewayPaymentId: existingPayment.gateway_payment_id ?? `order_paid:${validation.eventId}`,
          gatewayOrderId: orderData.gatewayOrderId,
          amountPaise: orderData.amountPaidPaise,
          currency: orderData.currency,
          status: 'captured',
          captured: true,
          capturedAt: new Date().toISOString(),
          metadata: {
            webhook_event_id: validation.eventId,
            webhook_event_type: validation.eventType,
          },
        },
        source: `webhook:${validation.eventType}`,
      });
    }

    const { data: updatedEvent } = await supabase
      .from('payment_webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('id', inserted.id)
      .select('*')
      .single();

    return { duplicate: false, processed: true, event: updatedEvent ?? inserted };
  } catch (error) {
    await supabase
      .from('payment_webhook_events')
      .update({
        processed: false,
        processing_error: error instanceof Error ? error.message : 'Webhook processing failed',
      })
      .eq('id', inserted.id);
    throw error;
  }
}

export async function getPaymentById(paymentId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('payments')
    .select('*, order:orders(id, order_number, customer_name, customer_phone, customer_email, total, payment_status, order_status), refunds(*)')
    .eq('id', paymentId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw notFound('Payment not found');
  return data;
}

export async function createRefundPlaceholder({
  paymentId,
  amountPaise,
  reason,
  notes,
  idempotencyKey,
  adminId,
}: {
  paymentId: string;
  amountPaise: number;
  reason: string;
  notes?: string;
  idempotencyKey: string;
  adminId: string;
}) {
  const supabase = createServiceClient();
  const provider = getPaymentProvider();

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle();

  if (paymentError) throw paymentError;
  if (!payment) throw notFound('Payment not found');

  const typedPayment = payment as PaymentRow;
  const { data: processingRefunds, error: refundCheckError } = await supabase
    .from('refunds')
    .select('id')
    .eq('payment_id', paymentId)
    .in('status', ['approved', 'processing']);

  if (refundCheckError) throw refundCheckError;

  const validation = validateRefundAmount({
    capturedAmountPaise: typedPayment.amount_paise,
    alreadyRefundedPaise: typedPayment.refund_amount_paise ?? 0,
    requestedAmountPaise: amountPaise,
    existingProcessingRefund: Boolean(processingRefunds?.length),
  });

  if (!validation.ok) throw badRequest(validation.reason, 'invalid_refund');

  const providerRefund = await provider.createRefund({
    paymentId: typedPayment.gateway_payment_id ?? typedPayment.id,
    amountPaise,
    reason,
    idempotencyKey,
    notes: notes ? { notes } : undefined,
  });

  const { data: refund, error: refundError } = await supabase
    .from('refunds')
    .insert({
      order_id: typedPayment.order_id,
      payment_id: typedPayment.id,
      requested_amount_paise: amountPaise,
      approved_amount_paise: amountPaise,
      reason,
      notes: notes ?? null,
      status: 'processing',
      gateway_refund_id: providerRefund.gatewayRefundId,
      requested_by: adminId,
      approved_by: adminId,
      approved_at: new Date().toISOString(),
      idempotency_key: idempotencyKey,
      metadata: providerRefund.metadata,
    })
    .select('*')
    .single();

  if (refundError) throw refundError;

  await writeAdminAuditLog({
    supabase,
    adminId,
    action: 'refund.placeholder_created',
    entity: 'refund',
    entityId: refund.id,
    afterData: refund,
    metadata: {
      payment_id: paymentId,
      provider: provider.name,
      integration_pending: providerRefund.integrationPending,
    },
  });

  return { refund, provider_refund: providerRefund };
}
