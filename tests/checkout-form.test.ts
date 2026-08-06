import { describe, expect, it } from 'vitest';
import {
  acquireCheckoutSubmission,
  buildCheckoutOrderPayload,
  expandCheckoutFieldErrors,
  getCheckoutDismissalState,
  hasPreparedRazorpayCheckout,
  mapCheckoutApiFieldErrors,
  releaseCheckoutSubmission,
  sanitizePhoneFieldValue,
  sanitizePincode,
  validateCheckoutForm,
  type CheckoutFormValues,
} from '@/lib/checkout-form';
import { INDIAN_PHONE_ERROR } from '@/lib/phone';
import { checkoutSchema } from '@/lib/validators';

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';

const validForm: CheckoutFormValues = {
  name: 'Aanya Sharma',
  email: 'aanya@example.com',
  phone: '9876543210',
  line1: 'Flat 12, Gulmohar Residency, C-Scheme',
  line2: 'Near Central Park',
  city: 'Jaipur',
  state: 'Rajasthan',
  pincode: '302001',
  notes: 'Please call before delivery.',
};

describe('checkout delivery form', () => {
  it('accepts a valid form and produces an API-schema-compatible request', () => {
    expect(validateCheckoutForm(validForm)).toEqual({});

    const payload = buildCheckoutOrderPayload({
      form: validForm,
      couponCode: 'WELCOME10',
      items: [{ product_id: PRODUCT_ID, quantity: 1 }],
    });

    expect(checkoutSchema.safeParse(payload).success).toBe(true);
  });

  it('rejects an invalid phone with the shared useful message', () => {
    expect(validateCheckoutForm({ ...validForm, phone: '1234567890' }).phone).toBe(
      INDIAN_PHONE_ERROR
    );
  });

  it('rejects invalid PIN codes while retaining valid leading zeroes', () => {
    expect(validateCheckoutForm({ ...validForm, pincode: '30201' }).pincode).toBe(
      'Enter a valid 6-digit PIN code'
    );
    expect(validateCheckoutForm({ ...validForm, pincode: '012345' }).pincode).toBeUndefined();
    expect(sanitizePincode('01a2345')).toBe('012345');
  });

  it('reports all missing required delivery fields', () => {
    const errors = validateCheckoutForm({
      ...validForm,
      name: '',
      phone: '',
      line1: '',
      city: '',
      state: '',
      pincode: '',
    });

    expect(errors).toMatchObject({
      name: 'Enter your full name',
      phone: INDIAN_PHONE_ERROR,
      line1: 'Enter your house number, building, street and area',
      city: 'Enter your city',
      state: 'Select your state',
      pincode: 'Enter a valid 6-digit PIN code',
    });
  });

  it('maps precise API field errors to their matching form controls', () => {
    const expanded = expandCheckoutFieldErrors(
      {
        formErrors: [],
        fieldErrors: {
          customer_phone: [INDIAN_PHONE_ERROR],
          shipping_address: ['PIN must be 6 digits'],
        },
      },
      [
        {
          path: ['shipping_address', 'pincode'],
          message: 'PIN must be 6 digits',
        },
        {
          path: ['customer_phone'],
          message: INDIAN_PHONE_ERROR,
        },
      ]
    );

    expect(mapCheckoutApiFieldErrors(expanded.fieldErrors)).toEqual({
      phone: INDIAN_PHONE_ERROR,
      pincode: 'PIN must be 6 digits',
    });
  });

  it('prevents a repeated submission until the active attempt releases its lock', () => {
    const lock = { current: false };

    expect(acquireCheckoutSubmission(lock)).toBe(true);
    expect(acquireCheckoutSubmission(lock)).toBe(false);
    releaseCheckoutSubmission(lock);
    expect(acquireCheckoutSubmission(lock)).toBe(true);
  });

  it('retains entered delivery data after Razorpay is dismissed', () => {
    const checkout = { order_id: 'pending-order' };
    const state = getCheckoutDismissalState(validForm, checkout);

    expect(state.form).toBe(validForm);
    expect(state.pendingCheckout).toBe(checkout);
    expect(state.processing).toBe(false);
  });

  it('normalizes the phone in both request locations without converting it to a number', () => {
    const payload = buildCheckoutOrderPayload({
      form: { ...validForm, phone: '+91 98765 43210' },
      items: [{ product_id: PRODUCT_ID, quantity: 2 }],
    });

    expect(payload.customer_phone).toBe('9876543210');
    expect(payload.shipping_address.phone).toBe('9876543210');
    expect(typeof payload.customer_phone).toBe('string');
    expect(sanitizePhoneFieldValue('+919876543210')).toBe('9876543210');
    expect(sanitizePhoneFieldValue('98ab76')).toBe('9876');
  });

  it('preserves every order-creation request field and nested address key', () => {
    const payload = buildCheckoutOrderPayload({
      form: validForm,
      couponCode: 'WELCOME10',
      items: [{ product_id: PRODUCT_ID, quantity: 2 }],
    });

    expect(Object.keys(payload)).toEqual([
      'customer_name',
      'customer_email',
      'customer_phone',
      'shipping_address',
      'payment_method',
      'coupon_code',
      'notes',
      'items',
    ]);
    expect(Object.keys(payload.shipping_address)).toEqual([
      'full_name',
      'phone',
      'line1',
      'line2',
      'city',
      'state',
      'pincode',
      'country',
    ]);
    expect(payload.payment_method).toBe('razorpay');
    expect(payload.items).toEqual([{ product_id: PRODUCT_ID, quantity: 2 }]);
  });

  it('allows Razorpay to open only after a successful prepared-order response', () => {
    const prepared = { checkout: { razorpay_order_id: 'order_test_123' } };

    expect(hasPreparedRazorpayCheckout(false, prepared)).toBe(false);
    expect(hasPreparedRazorpayCheckout(true, { checkout: undefined })).toBe(false);
    expect(hasPreparedRazorpayCheckout(true, prepared)).toBe(true);
  });
});
