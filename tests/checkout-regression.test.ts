import { describe, expect, it } from 'vitest';
import {
  buildPayableCheckoutIdentity,
  buildOrderItemRows,
  buildRazorpayOrderPayload,
  canReuseCheckoutForPayableIdentity,
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
  isPaymentAttemptReusable,
  sanitizeRazorpayNotes,
  shouldCommitCheckoutInventory,
} from '@/lib/payments/checkout-preparation';
import {
  CheckoutProcessingError,
  RazorpayProviderError,
  checkoutFailureLog,
} from '@/lib/payments/checkout-errors';
import { checkoutSchema, type CheckoutInput } from '@/lib/validators';
import { isCheckoutAmountCurrent } from '@/lib/checkout-form';
import { INDIAN_PHONE_ERROR, normalizeIndianPhone } from '@/lib/phone';
import type { PaymentProviderOrder } from '@/lib/payments/types';
import type { Product } from '@/types';

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const SECOND_PRODUCT_ID = '33333333-3333-4333-8333-333333333333';
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
  it.each([
    '9876543210',
    '+919876543210',
    '919876543210',
    '09876543210',
    '+91 98765 43210',
    '98765-43210',
    '98765 43210',
  ])('normalizes accepted Indian phone input %s', (phone) => {
    expect(normalizeIndianPhone(phone)).toBe('9876543210');
  });

  it.each([
    '1234567890',
    '5876543210',
    '987654321',
    '98765432100',
    'abcdefghij',
    '',
    '+91',
  ])('rejects invalid Indian phone input %s', (phone) => {
    expect(normalizeIndianPhone(phone)).toBeNull();
  });

  it('accepts a plain 10-digit customer phone in the API schema', () => {
    const parsed = checkoutSchema.parse({
      ...checkoutInput,
      customer_phone: '9876543210',
    });

    expect(parsed.customer_phone).toBe('9876543210');
    expect(parsed.shipping_address.phone).toBe('9876543210');
  });

  it('normalizes formatted phone values before payment processing', () => {
    const parsed = checkoutSchema.parse({
      ...checkoutInput,
      customer_phone: '+91 98765 43210',
      shipping_address: {
        ...checkoutInput.shipping_address,
        phone: '09876543210',
      },
    });

    expect(parsed.customer_phone).toBe('9876543210');
    expect(parsed.shipping_address.phone).toBe('9876543210');
  });

  it('returns a useful customer phone validation message', () => {
    const result = checkoutSchema.safeParse({
      ...checkoutInput,
      customer_phone: '1234567890',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.customer_phone).toContain(INDIAN_PHONE_ERROR);
    }
  });

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

describe('payable checkout reuse identity', () => {
  const now = new Date('2026-08-17T10:00:00.000Z');
  const validExpiresAt = '2026-08-17T10:10:00.000Z';
  const expiredAt = '2026-08-17T09:59:00.000Z';

  function identity(overrides: {
    productId?: string;
    quantity?: number;
    unitPrice?: number;
    coupon?: { id: string | null; code: string | null; discount: number };
    shipping?: number;
    total?: number;
  } = {}) {
    const quantity = overrides.quantity ?? 1;
    const unitPrice = overrides.unitPrice ?? 799;
    const discount = overrides.coupon?.discount ?? 0;
    const shipping = overrides.shipping ?? 79;
    const subtotal = unitPrice * quantity;
    return buildPayableCheckoutIdentity({
      items: [
        {
          product_id: overrides.productId ?? PRODUCT_ID,
          quantity,
          unit_price: unitPrice,
        },
      ],
      coupon: overrides.coupon ?? { id: null, code: null, discount: 0 },
      totals: {
        subtotal,
        discount,
        shipping,
        tax: 0,
        total: overrides.total ?? subtotal - discount + shipping,
      },
    });
  }

  function providerOrder(amountPaise: number): PaymentProviderOrder {
    return {
      provider: 'razorpay',
      gatewayOrderId: 'order_test_123',
      amountPaise,
      currency: 'INR',
      status: 'pending',
      integrationPending: false,
      metadata: {},
    };
  }

  it('allows exact same checkout retry while the pending session is still valid', () => {
    const current = identity();
    const metadata = { checkout_payable_signature: current.signature };

    expect(
      canReuseCheckoutForPayableIdentity({
        metadata,
        currentSignature: current.signature,
      })
    ).toBe(true);
    expect(
      isPaymentAttemptReusable({
        attempt: {
          amount_paise: 87800,
          currency: 'INR',
          expires_at: validExpiresAt,
          status: 'pending',
        },
        providerOrder: providerOrder(87800),
        expectedAmountPaise: 87800,
        expectedCurrency: 'INR',
        now,
      })
    ).toBe(true);
  });

  it('rejects old 378 pending checkout when the current cart is 878', () => {
    const oldPending = identity({ unitPrice: 299, total: 378 });
    const current = identity();

    expect(oldPending.amount_paise).toBe(37800);
    expect(current.amount_paise).toBe(87800);
    expect(
      canReuseCheckoutForPayableIdentity({
        metadata: { checkout_payable_signature: oldPending.signature },
        currentSignature: current.signature,
      })
    ).toBe(false);
  });

  it('rejects reuse when product, quantity, coupon, or shipping changes', () => {
    const original = identity();
    const metadata = { checkout_payable_signature: original.signature };

    expect(
      canReuseCheckoutForPayableIdentity({
        metadata,
        currentSignature: identity({ productId: SECOND_PRODUCT_ID }).signature,
      })
    ).toBe(false);
    expect(
      canReuseCheckoutForPayableIdentity({
        metadata,
        currentSignature: identity({ quantity: 2, total: 1677 }).signature,
      })
    ).toBe(false);
    expect(
      canReuseCheckoutForPayableIdentity({
        metadata,
        currentSignature: identity({
          coupon: { id: 'coupon-id', code: 'SAVE100', discount: 100 },
          total: 778,
        }).signature,
      })
    ).toBe(false);
    expect(
      canReuseCheckoutForPayableIdentity({
        metadata,
        currentSignature: identity({ shipping: 0, total: 799 }).signature,
      })
    ).toBe(false);
  });

  it('allows reuse when the cart is restored to the exact original payable checkout', () => {
    const original = identity();
    const changed = identity({ quantity: 2, total: 1677 });
    const restored = identity();
    const metadata = { checkout_payable_signature: original.signature };

    expect(changed.signature).not.toBe(original.signature);
    expect(restored.signature).toBe(original.signature);
    expect(
      canReuseCheckoutForPayableIdentity({
        metadata,
        currentSignature: restored.signature,
      })
    ).toBe(true);
  });

  it('fails closed for expired attempts or missing comparison metadata', () => {
    const current = identity();

    expect(
      canReuseCheckoutForPayableIdentity({
        metadata: {},
        currentSignature: current.signature,
      })
    ).toBe(false);
    expect(
      isPaymentAttemptReusable({
        attempt: {
          amount_paise: 87800,
          currency: 'INR',
          expires_at: expiredAt,
          status: 'pending',
        },
        providerOrder: providerOrder(87800),
        expectedAmountPaise: 87800,
        expectedCurrency: 'INR',
        now,
      })
    ).toBe(false);
  });

  it('rejects Razorpay amount mismatch before opening the payment modal', () => {
    expect(isCheckoutAmountCurrent({ amount: 87800, currency: 'INR', total: 878 })).toBe(true);
    expect(isCheckoutAmountCurrent({ amount: 37800, currency: 'INR', total: 878 })).toBe(false);
    expect(isCheckoutAmountCurrent({ amount: 87800, currency: 'USD', total: 878 })).toBe(false);
    expect(
      isPaymentAttemptReusable({
        attempt: {
          amount_paise: 37800,
          currency: 'INR',
          expires_at: validExpiresAt,
          status: 'pending',
        },
        providerOrder: providerOrder(37800),
        expectedAmountPaise: 87800,
        expectedCurrency: 'INR',
        now,
      })
    ).toBe(false);
  });

  it('keeps same idempotency network retry on one provider order and one reservation path', () => {
    expect(
      getPaymentAttemptDecision({
        status: 'pending',
        hasProviderOrder: true,
        hasPayment: true,
      })
    ).toBe('reuse');
    expect(
      isPaymentAttemptReusable({
        attempt: {
          amount_paise: 87800,
          currency: 'INR',
          expires_at: validExpiresAt,
          status: 'pending',
        },
        providerOrder: providerOrder(87800),
        expectedAmountPaise: 87800,
        expectedCurrency: 'INR',
        now,
      })
    ).toBe(true);
  });

  it('never treats captured or placed checkout as payable', () => {
    expect(
      getCheckoutResumeDecision({
        orderStatus: 'placed',
        paymentStatus: 'captured',
      })
    ).toBe('not_payable');
    expect(
      isPaymentAttemptReusable({
        attempt: {
          amount_paise: 87800,
          currency: 'INR',
          expires_at: validExpiresAt,
          status: 'captured',
        },
        providerOrder: { ...providerOrder(87800), status: 'captured' },
        expectedAmountPaise: 87800,
        expectedCurrency: 'INR',
        now,
      })
    ).toBe(false);
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
