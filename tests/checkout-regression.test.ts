import { describe, expect, it } from 'vitest';
import {
  buildOrderItemRows,
  buildRazorpayOrderPayload,
  createCheckoutFingerprint,
  createCheckoutReference,
  createRazorpayReceipt,
  getCheckoutResumeDecision,
  getFailedCheckoutState,
  getPaymentAttemptDecision,
  getPreparedCheckoutState,
  getRazorpayConfigurationError,
  getRazorpayOrderResponseError,
  getRazorpayOrderValidationError,
  sanitizeRazorpayNotes,
  shouldCommitCheckoutInventory,
} from '@/lib/payments/checkout-preparation';
import {
  CheckoutProcessingError,
  RazorpayProviderError,
  checkoutFailureLog,
} from '@/lib/payments/checkout-errors';
import { checkoutSchema, type CheckoutInput } from '@/lib/validators';
import type { Product } from '@/types';

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const ORDER_ID = '22222222-2222-4222-8222-222222222222';

const checkoutInput: CheckoutInput = {
  customer_name: 'Checkout Customer',
  customer_email: 'customer@example.com',
  customer_phone: '9876543210',
  shipping_address: {
    full_name: 'Checkout Customer',
    phone: '9876543210',
    line1: '12 Market Road',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302001',
    country: 'India',
  },
  payment_method: 'razorpay',
  items: [{ product_id: PRODUCT_ID, quantity: 2 }],
};

const product = {
  id: PRODUCT_ID,
  slug: 'gold-earrings',
  name: 'Gold Earrings',
  sku: 'GR-EAR-001',
  images: ['https://example.com/earrings.jpg'],
  price: 1299,
  original_price: 1599,
  category_id: null,
} as Product;

describe('checkout schema regression', () => {
  it('uses the exact remote order_items columns', () => {
    const [row] = buildOrderItemRows({
      orderId: ORDER_ID,
      items: checkoutInput.items,
      productsById: new Map([[product.id, product]]),
    });

    expect(row).toMatchObject({
      order_id: ORDER_ID,
      product_id: PRODUCT_ID,
      product_name: 'Gold Earrings',
      sku: 'GR-EAR-001',
      unit_price: 1299,
      quantity: 2,
      discount_amount: 0,
      discount: 0,
      tax: 0,
      line_total: 2598,
    });
    expect(row).not.toHaveProperty('product_sku');
    expect(row).not.toHaveProperty('tax_amount');
  });

  it('rejects duplicate product rows before database processing', () => {
    const result = checkoutSchema.safeParse({
      ...checkoutInput,
      items: [checkoutInput.items[0], checkoutInput.items[0]],
    });
    expect(result.success).toBe(false);
  });
});

describe('checkout idempotency and retry decisions', () => {
  it('maps repeated Pay requests to one checkout reference', () => {
    const key = 'checkout:33333333-3333-4333-8333-333333333333';
    expect(createCheckoutReference(key)).toBe(createCheckoutReference(key));
    expect(createCheckoutReference(key)).not.toBe(
      createCheckoutReference('checkout:44444444-4444-4444-8444-444444444444')
    );
  });

  it('uses a unique, 40-character-safe receipt for each payment retry', () => {
    const checkoutReference = 'chk_1234567890123456789012345678';
    const first = createRazorpayReceipt(checkoutReference, 'checkout:first-attempt');
    const repeated = createRazorpayReceipt(checkoutReference, 'checkout:first-attempt');
    const retry = createRazorpayReceipt(checkoutReference, 'retry:second-attempt');
    expect(first).toBe(repeated);
    expect(retry).not.toBe(first);
    expect(first.length).toBeLessThanOrEqual(40);
  });

  it('uses a stable fingerprint and detects changed checkout contents', () => {
    expect(createCheckoutFingerprint(checkoutInput, null)).toBe(
      createCheckoutFingerprint(checkoutInput, null)
    );
    expect(createCheckoutFingerprint(checkoutInput, null)).not.toBe(
      createCheckoutFingerprint(
        { ...checkoutInput, items: [{ product_id: PRODUCT_ID, quantity: 3 }] },
        null
      )
    );
  });

  it('reuses prepared attempts, retries failed initialization, and blocks concurrent work', () => {
    expect(
      getPaymentAttemptDecision({
        status: 'pending',
        hasProviderOrder: true,
        hasPayment: true,
      })
    ).toBe('reuse');
    expect(
      getPaymentAttemptDecision({
        status: 'failed',
        hasProviderOrder: false,
        hasPayment: false,
      })
    ).toBe('retry');
    expect(
      getPaymentAttemptDecision({
        status: 'pending',
        hasProviderOrder: false,
        hasPayment: false,
      })
    ).toBe('in_progress');
  });
});

describe('pending checkout safety', () => {
  it('creates a payable pending state without placing the order', () => {
    const state = getPreparedCheckoutState('2026-08-06T16:30:00.000Z');
    expect(state).toEqual({
      payment_status: 'pending',
      order_status: 'pending_payment',
      stock_reserved_until: '2026-08-06T16:30:00.000Z',
    });
    expect(state.order_status).not.toBe('placed');
  });

  it('keeps failed initialization retryable and does not place an order', () => {
    expect(getFailedCheckoutState('razorpay_order_creation_failed')).toEqual({
      payment_status: 'failed',
      order_status: 'pending_payment',
      payment_failure_reason: 'razorpay_order_creation_failed',
    });
    expect(
      getCheckoutResumeDecision({
        orderStatus: 'pending_payment',
        paymentStatus: 'failed',
      })
    ).toBe('resume');
  });

  it('does not commit inventory before capture or more than once', () => {
    expect(
      shouldCommitCheckoutInventory({
        paymentCaptured: false,
        inventoryCommittedAt: null,
      })
    ).toBe(false);
    expect(
      shouldCommitCheckoutInventory({
        paymentCaptured: true,
        inventoryCommittedAt: null,
      })
    ).toBe(true);
    expect(
      shouldCommitCheckoutInventory({
        paymentCaptured: true,
        inventoryCommittedAt: '2026-08-06T16:00:00.000Z',
      })
    ).toBe(false);
  });
});

describe('classified checkout diagnostics', () => {
  it('classifies the discovered order-item insert failure without customer data', () => {
    const error = new CheckoutProcessingError({
      publicError: 'order_database_error',
      stage: 'order_items_insert',
      checkoutReference: 'chk_safe_reference',
      cause: {
        code: 'PGRST204',
        message: "Could not find the 'product_sku' column of 'order_items' in the schema cache",
        details: null,
        hint: null,
      },
    });

    expect(checkoutFailureLog(error, 'request-1')).toEqual({
      request_id: 'request-1',
      processing_stage: 'order_items_insert',
      checkout_reference: 'chk_safe_reference',
      supabase_code: 'PGRST204',
      supabase_message:
        "Could not find the 'product_sku' column of 'order_items' in the schema cache",
      supabase_details: null,
      supabase_hint: null,
    });
  });

  it('classifies stock and Razorpay failures by processing stage', () => {
    expect(
      new CheckoutProcessingError({
        publicError: 'stock_reservation_failed',
        stage: 'stock_reservation',
      }).publicError
    ).toBe('stock_reservation_failed');

    const providerError = new RazorpayProviderError({
      code: 'BAD_REQUEST_ERROR',
      description: 'Razorpay order payload validation failed',
      httpStatus: 400,
    });
    const checkoutError = new CheckoutProcessingError({
      publicError: 'razorpay_order_creation_failed',
      stage: 'razorpay_order_creation',
      cause: providerError,
    });
    expect(checkoutFailureLog(checkoutError, 'request-2')).toMatchObject({
      razorpay_code: 'BAD_REQUEST_ERROR',
      razorpay_description: 'Razorpay order payload validation failed',
    });
  });
});

describe('Razorpay order validation', () => {
  it('detects missing credentials and test/live key mismatch without exposing values', () => {
    expect(
      getRazorpayConfigurationError({
        provider: 'razorpay',
        publicKeyId: 'rzp_test_public',
        serverKeyId: undefined,
        serverKeySecret: undefined,
      })
    ).toBe('razorpay_not_configured');
    expect(
      getRazorpayConfigurationError({
        provider: 'razorpay',
        publicKeyId: 'rzp_test_public',
        serverKeyId: 'rzp_live_server',
        serverKeySecret: 'configured-secret',
      })
    ).toBe('razorpay_key_mismatch');
  });

  it('rejects invalid amount, currency, and receipts longer than 40 characters', () => {
    expect(
      getRazorpayOrderValidationError({ amountPaise: 10.5, currency: 'INR', receipt: 'chk_1' })
    ).toBe('invalid_razorpay_amount');
    expect(
      getRazorpayOrderValidationError({ amountPaise: 100, currency: 'USD', receipt: 'chk_1' })
    ).toBe('invalid_razorpay_currency');
    expect(
      getRazorpayOrderValidationError({
        amountPaise: 100,
        currency: 'INR',
        receipt: 'x'.repeat(41),
      })
    ).toBe('invalid_razorpay_receipt');
  });

  it('rejects Razorpay order responses with mismatched amount or currency', () => {
    expect(
      getRazorpayOrderResponseError({
        expectedAmountPaise: 10000,
        actualAmountPaise: 9999,
        expectedCurrency: 'INR',
        actualCurrency: 'INR',
      })
    ).toBe('razorpay_order_amount_mismatch');
    expect(
      getRazorpayOrderResponseError({
        expectedAmountPaise: 10000,
        actualAmountPaise: 10000,
        expectedCurrency: 'INR',
        actualCurrency: 'USD',
      })
    ).toBe('razorpay_order_currency_mismatch');
  });

  it('removes empty or undefined note values', () => {
    const notes = sanitizeRazorpayNotes({
      checkout_reference: 'chk_1',
      empty: '',
      missing: undefined,
    } as unknown as Record<string, string>);
    expect(notes).toEqual({ checkout_reference: 'chk_1' });
  });

  it('builds only supported Razorpay Orders API properties', () => {
    const payload = buildRazorpayOrderPayload({
      internalOrderId: ORDER_ID,
      receipt: 'chk_123',
      amountPaise: 129900,
      currency: 'INR',
      idempotencyKey: 'checkout:12345678',
      notes: { order_number: '' },
    });
    expect(payload).toEqual({
      amount: 129900,
      currency: 'INR',
      receipt: 'chk_123',
      notes: {
        internal_order_id: ORDER_ID,
        checkout_reference: 'chk_123',
      },
    });
    expect(payload).not.toHaveProperty('payment_capture');
  });
});
