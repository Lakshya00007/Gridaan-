import { INDIAN_PHONE_ERROR, normalizeIndianPhone } from '@/lib/phone';

export type CheckoutFormValues = {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  notes: string;
};

export type CheckoutFormErrors = Partial<Record<keyof CheckoutFormValues, string>>;

export const CHECKOUT_FIELD_ORDER: Array<keyof CheckoutFormValues> = [
  'name',
  'phone',
  'email',
  'line1',
  'line2',
  'city',
  'state',
  'pincode',
  'notes',
];

export const EMPTY_CHECKOUT_FORM: CheckoutFormValues = {
  name: '',
  email: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  notes: '',
};

export function sanitizePhoneFieldValue(input: string): string {
  const normalized = normalizeIndianPhone(input);
  return normalized ?? input.replace(/\D/g, '').slice(0, 10);
}

export function sanitizePincode(input: string): string {
  return input.replace(/\D/g, '').slice(0, 6);
}

export function validateCheckoutForm(form: CheckoutFormValues): CheckoutFormErrors {
  const errors: CheckoutFormErrors = {};

  if (form.name.trim().length < 2) errors.name = 'Enter your full name';
  if (!normalizeIndianPhone(form.phone)) errors.phone = INDIAN_PHONE_ERROR;
  if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address';
  }
  if (form.line1.trim().length < 4) {
    errors.line1 = 'Enter your house number, building, street and area';
  }
  if (form.city.trim().length < 2) errors.city = 'Enter your city';
  if (form.state.trim().length < 2) errors.state = 'Select your state';
  if (!/^\d{6}$/.test(form.pincode)) errors.pincode = 'Enter a valid 6-digit PIN code';
  if (form.notes.length > 500) errors.notes = 'Order notes cannot exceed 500 characters';

  return errors;
}

const API_FIELD_TO_FORM_FIELD: Array<[string, keyof CheckoutFormValues]> = [
  ['customer_name', 'name'],
  ['customer_phone', 'phone'],
  ['customer_email', 'email'],
  ['shipping_address.full_name', 'name'],
  ['shipping_address.phone', 'phone'],
  ['shipping_address.line1', 'line1'],
  ['shipping_address.line2', 'line2'],
  ['shipping_address.city', 'city'],
  ['shipping_address.state', 'state'],
  ['shipping_address.pincode', 'pincode'],
  ['notes', 'notes'],
  ['shipping_address', 'line1'],
];

export function mapCheckoutApiFieldErrors(
  fieldErrors: Record<string, string[] | undefined> | undefined
): CheckoutFormErrors {
  const mapped: CheckoutFormErrors = {};
  const hasPreciseAddressError = Object.keys(fieldErrors ?? {}).some((field) =>
    field.startsWith('shipping_address.')
  );

  for (const [apiField, formField] of API_FIELD_TO_FORM_FIELD) {
    if (apiField === 'shipping_address' && hasPreciseAddressError) continue;
    const message = fieldErrors?.[apiField]?.[0];
    if (message && !mapped[formField]) mapped[formField] = message;
  }

  return mapped;
}

export function expandCheckoutFieldErrors(
  flattened: {
    formErrors: string[];
    fieldErrors: Record<string, string[] | undefined>;
  },
  issues: Array<{ path: PropertyKey[]; message: string }>
) {
  const fieldErrors = { ...flattened.fieldErrors };

  for (const issue of issues) {
    if (issue.path.length < 2) continue;
    const field = issue.path.map(String).join('.');
    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
  }

  return { ...flattened, fieldErrors };
}

export function acquireCheckoutSubmission(lock: { current: boolean }): boolean {
  if (lock.current) return false;
  lock.current = true;
  return true;
}

export function releaseCheckoutSubmission(lock: { current: boolean }) {
  lock.current = false;
}

export function hasPreparedRazorpayCheckout<T extends {
  checkout?: { razorpay_order_id?: string | null };
}>(
  responseOk: boolean,
  response: T
): response is T & { checkout: NonNullable<T['checkout']> & { razorpay_order_id: string } } {
  return responseOk && Boolean(response.checkout?.razorpay_order_id);
}

export function getCheckoutDismissalState<TForm, TCheckout>(
  form: TForm,
  pendingCheckout: TCheckout
) {
  return {
    form,
    pendingCheckout,
    processing: false as const,
  };
}

export function getCheckoutAmountPaise(total: number) {
  if (!Number.isFinite(total) || total < 0) return 0;
  return Math.round(total * 100);
}

export function isCheckoutAmountCurrent({
  amount,
  currency,
  total,
}: {
  amount: number;
  currency: string;
  total: number;
}) {
  return currency === 'INR' && amount === getCheckoutAmountPaise(total);
}

export function buildCheckoutOrderPayload({
  form,
  couponCode,
  marketingConsent,
  items,
}: {
  form: CheckoutFormValues;
  couponCode?: string;
  marketingConsent?: {
    version: number;
    marketing: boolean;
    decided_at?: string | null;
  };
  items: Array<{ product_id: string; quantity: number }>;
}) {
  const customerPhone = normalizeIndianPhone(form.phone);
  if (!customerPhone) throw new Error(INDIAN_PHONE_ERROR);

  return {
    customer_name: form.name,
    customer_email: form.email,
    customer_phone: customerPhone,
    shipping_address: {
      full_name: form.name,
      phone: customerPhone,
      line1: form.line1,
      line2: form.line2 || undefined,
      city: form.city,
      state: form.state,
      pincode: form.pincode,
      country: 'India',
    },
    payment_method: 'razorpay' as const,
    coupon_code: couponCode,
    notes: form.notes,
    ...(marketingConsent ? { marketing_consent: marketingConsent } : {}),
    items,
  };
}
