'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  Check,
  CreditCard,
  FileText,
  LoaderCircle,
  Lock,
  Mail,
  MapPin,
  Navigation,
  ShieldCheck,
  Tag,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/store/cart';
import { useUI } from '@/store/ui';
import { formatRupees, cn } from '@/lib/utils';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from '@/lib/config';
import type { CartProductSnapshot, Coupon, OrderSuccessSummary } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { publicEnv } from '@/lib/env.public';
import { CONSENT_CHANGED_EVENT, getCheckoutConsentSnapshot } from '@/lib/analytics/consent';
import {
  META_PIXEL_READY_EVENT,
  trackMetaInitiateCheckout,
  trackMetaPurchase,
} from '@/lib/analytics/meta';
import {
  acquireCheckoutSubmission,
  buildCheckoutOrderPayload,
  CHECKOUT_FIELD_ORDER,
  EMPTY_CHECKOUT_FORM,
  getCheckoutDismissalState,
  isCheckoutAmountCurrent,
  hasPreparedRazorpayCheckout,
  mapCheckoutApiFieldErrors,
  releaseCheckoutSubmission,
  sanitizePhoneFieldValue,
  sanitizePincode,
  validateCheckoutForm,
  type CheckoutFormErrors,
  type CheckoutFormValues,
} from '@/lib/checkout-form';

type OrderApiResponse = {
  checkout?: RazorpayCheckoutPayload;
  order?: OrderSuccessSummary;
  error?: string;
  message?: string;
  request_id?: string;
  issues?: {
    formErrors?: string[];
    fieldErrors?: Record<string, string[] | undefined>;
  };
};

type VerifyPaymentResponse = {
  order?: OrderSuccessSummary;
  placed?: boolean;
  error?: string;
};

type RazorpayCheckoutPayload = {
  order_id: string;
  payment_id: string | null;
  attempt_id: string | null;
  checkout_reference: string;
  razorpay_order_id: string;
  amount: number;
  currency: 'INR';
  key: string | null;
  business_name: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  items?: Array<{ product: CartProductSnapshot; quantity: number }>;
  expires_at: string | null;
};

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailureResponse = {
  error?: {
    code?: string;
    description?: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
    };
  };
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: 'INR';
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email?: string;
    contact: string;
  };
  notes: Record<string, string>;
  theme: { color: string };
  modal: { ondismiss: () => void };
  handler: (response: RazorpaySuccessResponse) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
      on: (event: 'payment.failed', handler: (response: RazorpayFailureResponse) => void) => void;
    };
  }
}

const indianStates = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi',
];
const PENDING_CHECKOUT_STORAGE_KEY = 'gridaan-pending-checkout';
const CHECKOUT_IDEMPOTENCY_STORAGE_KEY = 'gridaan-razorpay-checkout-key';

function isRestorablePendingCheckout(value: unknown): value is RazorpayCheckoutPayload {
  if (!value || typeof value !== 'object') return false;
  const checkout = value as Partial<RazorpayCheckoutPayload>;
  const expiresAt = checkout.expires_at ? new Date(checkout.expires_at).getTime() : null;
  const amount = checkout.amount;
  return (
    typeof checkout.order_id === 'string' &&
    typeof checkout.checkout_reference === 'string' &&
    typeof checkout.razorpay_order_id === 'string' &&
    typeof amount === 'number' &&
    Number.isSafeInteger(amount) &&
    amount > 0 &&
    checkout.currency === 'INR' &&
    (expiresAt === null || (Number.isFinite(expiresAt) && expiresAt > Date.now()))
  );
}

export default function CheckoutView() {
  const router = useRouter();
  const { guest, clear } = useCart();
  const { setSearchQuery } = useUI();
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();
  const processingLock = useRef(false);
  const initiateCheckoutTrackedRef = useRef<string | null>(null);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [errors, setErrors] = useState<CheckoutFormErrors>({});
  const [processing, setProcessing] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<RazorpayCheckoutPayload | null>(null);
  const [form, setForm] = useState<CheckoutFormValues>(EMPTY_CHECKOUT_FORM);

  useEffect(() => {
    setMounted(true);
    const storedCheckout = window.localStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
    if (storedCheckout) {
      try {
        const parsed = JSON.parse(storedCheckout) as unknown;
        if (isRestorablePendingCheckout(parsed)) {
          setPendingCheckout(parsed);
        } else {
          window.localStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
        }
      } catch {
        window.localStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
      }
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setForm((f) => ({
          ...f,
          email: data.user.email ?? f.email,
        }));
        supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', data.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (profile) {
              setForm((f) => ({
                ...f,
                name: f.name || profile.full_name || '',
                phone: f.phone || sanitizePhoneFieldValue(profile.phone || ''),
              }));
            }
          });
      }
    });
  }, []);

  const subtotal = guest.reduce((a, g) => a + g.product.price * g.quantity, 0);
  const discount = useMemo(() => {
    if (!coupon) return 0;
    let d = coupon.type === 'percentage' ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
    if (coupon.max_discount != null) d = Math.min(d, coupon.max_discount);
    return Math.min(d, subtotal);
  }, [coupon, subtotal]);
  const shipping = subtotal - discount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = Math.max(0, subtotal - discount + shipping);

  useEffect(() => {
    if (!mounted || !pendingCheckout || guest.length === 0) return;
    if (
      isCheckoutAmountCurrent({
        amount: pendingCheckout.amount,
        currency: pendingCheckout.currency,
        total,
      })
    ) {
      return;
    }

    setPendingCheckout(null);
    window.localStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
    window.localStorage.removeItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
  }, [guest.length, mounted, pendingCheckout, total]);

  useEffect(() => {
    if (!mounted || guest.length === 0) return;
    const cartSignature = guest
      .map((item) => `${item.product.id}:${item.quantity}`)
      .sort()
      .join('|');

    function tryTrackInitiateCheckout() {
      if (initiateCheckoutTrackedRef.current === cartSignature) return;
      const tracked = trackMetaInitiateCheckout({ items: guest, value: total });
      if (tracked) initiateCheckoutTrackedRef.current = cartSignature;
    }

    tryTrackInitiateCheckout();
    window.addEventListener(CONSENT_CHANGED_EVENT, tryTrackInitiateCheckout);
    window.addEventListener(META_PIXEL_READY_EVENT, tryTrackInitiateCheckout);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, tryTrackInitiateCheckout);
      window.removeEventListener(META_PIXEL_READY_EVENT, tryTrackInitiateCheckout);
    };
  }, [guest, mounted, total]);

  function setField(key: keyof CheckoutFormValues, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  }

  function setCheckoutProcessing(next: boolean) {
    if (!next) releaseCheckoutSubmission(processingLock);
    setProcessing(next);
  }

  function focusFirstInvalidField(nextErrors: CheckoutFormErrors) {
    const firstField = CHECKOUT_FIELD_ORDER.find((field) => nextErrors[field]);
    if (!firstField) return;

    window.requestAnimationFrame(() => {
      const element = document.getElementById(`checkout-${firstField}`);
      element?.focus({ preventScroll: true });
      element?.scrollIntoView({ block: 'center' });
    });
  }

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: couponCode, subtotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Invalid coupon');
        return;
      }
      setCoupon(data.coupon);
      toast.success('Coupon applied');
    } catch {
      toast.error('Failed to apply coupon');
    }
  }

  function getCheckoutIdempotencyKey() {
    const existing = window.localStorage.getItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
    if (existing) return existing;
    const key = `checkout:${crypto.randomUUID()}`;
    window.localStorage.setItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY, key);
    return key;
  }

  function clearCheckoutIdempotencyKey() {
    window.localStorage.removeItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
  }

  function clearPendingCheckoutState({ clearIdempotency = false } = {}) {
    setPendingCheckout(null);
    window.localStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
    if (clearIdempotency) clearCheckoutIdempotencyKey();
  }

  function hasCurrentPayableAmount(checkout: RazorpayCheckoutPayload) {
    return isCheckoutAmountCurrent({
      amount: checkout.amount,
      currency: checkout.currency,
      total,
    });
  }

  async function loadRazorpayCheckout() {
    if (window.Razorpay) return true;
    return new Promise<boolean>((resolve) => {
      const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(true), { once: true });
        existing.addEventListener('error', () => resolve(false), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function recordPaymentFailure({
    checkout,
    code,
    message,
    gatewayPaymentId,
    releaseReservation,
  }: {
    checkout: RazorpayCheckoutPayload;
    code: string;
    message: string;
    gatewayPaymentId?: string;
    releaseReservation: boolean;
  }) {
    await fetch('/api/payments/fail', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        order_id: checkout.order_id,
        checkout_reference: checkout.checkout_reference,
        payment_id: checkout.payment_id ?? undefined,
        gateway_order_id: checkout.razorpay_order_id,
        gateway_payment_id: gatewayPaymentId,
        error_code: code,
        error_message: message,
        release_reservation: releaseReservation,
      }),
    }).catch(() => null);
  }

  async function verifyRazorpayPayment(
    checkout: RazorpayCheckoutPayload,
    response: RazorpaySuccessResponse
  ) {
    const verifyResponse = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        order_id: checkout.order_id,
        checkout_reference: checkout.checkout_reference,
        gateway_order_id: response.razorpay_order_id,
        gateway_payment_id: response.razorpay_payment_id,
        signature: response.razorpay_signature,
      }),
    });
    const data = (await verifyResponse.json()) as VerifyPaymentResponse;
    if (!verifyResponse.ok) {
      throw new Error(data.error ?? 'Payment verification failed');
    }
    return data;
  }

  function openRazorpayCheckout(checkout: RazorpayCheckoutPayload) {
    if (!hasCurrentPayableAmount(checkout)) {
      clearPendingCheckoutState({ clearIdempotency: true });
      toast.error('Payment session changed. Please retry checkout.');
      setCheckoutProcessing(false);
      return;
    }

    if (!checkout.key && !publicEnv.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      toast.error('Razorpay key is not configured');
      setCheckoutProcessing(false);
      return;
    }

    const Razorpay = window.Razorpay;
    if (!Razorpay) {
      toast.error('Razorpay Checkout is unavailable');
      setCheckoutProcessing(false);
      return;
    }

    const razorpay = new Razorpay({
      key: checkout.key ?? publicEnv.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      amount: checkout.amount,
      currency: checkout.currency,
      name: 'Gridaan',
      description: 'Online Payment',
      order_id: checkout.razorpay_order_id,
      prefill: checkout.prefill,
      notes: {
        checkout_reference: checkout.checkout_reference,
        internal_order_id: checkout.order_id,
      },
      theme: { color: '#b8860b' },
      modal: {
        ondismiss: () => {
          void recordPaymentFailure({
            checkout,
            code: 'checkout_dismissed',
            message: 'Customer closed Razorpay Checkout before payment completion',
            releaseReservation: false,
          });
          const dismissalState = getCheckoutDismissalState(form, checkout);
          setPendingCheckout(dismissalState.pendingCheckout);
          setCheckoutProcessing(dismissalState.processing);
          toast.message('Payment was not completed. You can retry without creating a duplicate order.');
        },
      },
      handler: async (response) => {
        try {
          const verified = await verifyRazorpayPayment(checkout, response);
          if (!verified.placed || !verified.order?.order_number) {
            setPendingCheckout(checkout);
            setCheckoutProcessing(false);
            toast.message('Payment is being verified. Your order is not placed yet.');
            return;
          }

          trackMetaPurchase({
            order: verified.order,
            items: checkout.items?.length ? checkout.items : guest,
          });
          clear();
          setSearchQuery('');
          clearCheckoutIdempotencyKey();
          window.localStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
          toast.success('Payment successful. Order placed.');
          startTransition(() => {
            router.push(`/order-success?order=${encodeURIComponent(verified.order!.order_number)}`);
          });
        } catch (error) {
          await recordPaymentFailure({
            checkout,
            code: 'verification_failed',
            message: error instanceof Error ? error.message : 'Payment verification failed',
            gatewayPaymentId: response.razorpay_payment_id,
            releaseReservation: true,
          });
          const dismissalState = getCheckoutDismissalState(form, checkout);
          setPendingCheckout(dismissalState.pendingCheckout);
          setCheckoutProcessing(dismissalState.processing);
          toast.error(error instanceof Error ? error.message : 'Payment verification failed');
        }
      },
    });

    razorpay.on('payment.failed', (response) => {
      const code = response.error?.code ?? 'payment_failed';
      const message = response.error?.description ?? 'Razorpay payment failed';
      void recordPaymentFailure({
        checkout,
        code,
        message,
        gatewayPaymentId: response.error?.metadata?.payment_id,
        releaseReservation: true,
      });
      setPendingCheckout(checkout);
      setCheckoutProcessing(false);
      toast.error(message);
    });

    razorpay.open();
  }

  async function placeOrder() {
    if (!acquireCheckoutSubmission(processingLock)) return;

    const nextErrors = validateCheckoutForm(form);
    if (Object.keys(nextErrors).length > 0) {
      releaseCheckoutSubmission(processingLock);
      setErrors(nextErrors);
      focusFirstInvalidField(nextErrors);
      toast.error('Please fix the highlighted fields');
      return;
    }
    if (guest.length === 0) {
      releaseCheckoutSubmission(processingLock);
      toast.error('Your cart is empty');
      return;
    }
    setProcessing(true);
    try {
      const scriptLoaded = await loadRazorpayCheckout();
      if (!scriptLoaded || !window.Razorpay) {
        toast.error('Could not load Razorpay Checkout. Please try again.');
        setCheckoutProcessing(false);
        return;
      }
      const idempotencyKey = getCheckoutIdempotencyKey();
      const orderPayload = buildCheckoutOrderPayload({
        form,
        couponCode: coupon?.code,
        marketingConsent: getCheckoutConsentSnapshot(window.localStorage),
        items: guest.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      });

      async function prepareCheckout(key: string) {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'idempotency-key': key },
          body: JSON.stringify(orderPayload),
        });
        return { res, data: (await res.json()) as OrderApiResponse };
      }

      let prepared = await prepareCheckout(idempotencyKey);
      if (!prepared.res.ok && prepared.data.error === 'idempotency_conflict') {
        clearPendingCheckoutState({ clearIdempotency: true });
        prepared = await prepareCheckout(getCheckoutIdempotencyKey());
      }

      const { res, data } = prepared;
      if (!res.ok) {
        if (data.error === 'idempotency_conflict') clearCheckoutIdempotencyKey();
        const apiErrors = mapCheckoutApiFieldErrors(data.issues?.fieldErrors);
        if (data.error === 'validation_error' && Object.keys(apiErrors).length > 0) {
          setErrors(apiErrors);
          focusFirstInvalidField(apiErrors);
          toast.error('Please review the highlighted delivery details');
        } else {
          toast.error(
            data.message ??
              data.issues?.formErrors?.[0] ??
              data.error ??
              'Could not start payment'
          );
        }
        setCheckoutProcessing(false);
        return;
      }
      if (!hasPreparedRazorpayCheckout(res.ok, data)) {
        toast.error('Payment could not be prepared.');
        setCheckoutProcessing(false);
        return;
      }

      const checkoutItems = guest.map((item) => ({
        product: item.product,
        quantity: item.quantity,
      }));
      const preparedCheckout = { ...data.checkout, items: checkoutItems };
      if (!hasCurrentPayableAmount(preparedCheckout)) {
        clearPendingCheckoutState({ clearIdempotency: true });
        toast.error('Payment amount changed. Please retry checkout.');
        setCheckoutProcessing(false);
        return;
      }
      setPendingCheckout(preparedCheckout);
      window.localStorage.setItem(PENDING_CHECKOUT_STORAGE_KEY, JSON.stringify(preparedCheckout));
      openRazorpayCheckout(preparedCheckout);
    } catch (error) {
      console.error('[checkout] placeOrder failed', error);
      toast.error(error instanceof Error ? error.message : 'Network error');
      setCheckoutProcessing(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f8f5ef] pb-32 text-neutral-950 lg:pb-16">
      <div className="border-b border-stone-200/80 bg-white/90">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link
            href="/shop"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Continue shopping
          </Link>
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
            <Lock className="h-3.5 w-3.5 text-gold-700" aria-hidden="true" />
            Secure checkout
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-11">
        <div className="mb-7 flex flex-col gap-6 md:mb-9 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-gold-700">Complete your purchase</p>
            <h1 className="heading-display text-3xl text-neutral-950 sm:text-4xl">Checkout</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-600">
              Add your delivery details, review your jewellery, and continue to secure payment.
            </p>
          </div>
          <CheckoutProgress />
        </div>

        <form
          id="checkout-delivery-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void placeOrder();
          }}
        >
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {CHECKOUT_FIELD_ORDER.map((field) => errors[field]).find(Boolean) ?? ''}
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)] lg:gap-7">
            <div className="space-y-6">
              <section className="rounded-[22px] border border-stone-200/90 bg-white p-5 shadow-[0_18px_55px_-46px_rgba(45,35,20,0.55)] sm:p-7">
                <div className="mb-7">
                  <h2 className="text-xl font-semibold text-neutral-950">Delivery information</h2>
                  <p className="mt-1 text-sm text-neutral-500">Where should we deliver your order?</p>
                </div>

                <div className="space-y-8">
                  <div>
                    <SectionHeading icon={UserRound} title="Contact information" />
                    <div className="mt-4 grid gap-5 sm:grid-cols-2">
                      <Field id="checkout-name" label="Full Name" required error={errors.name}>
                        <input
                          id="checkout-name"
                          name="name"
                          autoComplete="name"
                          maxLength={120}
                          disabled={processing}
                          value={form.name}
                          onChange={(event) => setField('name', event.target.value)}
                          placeholder="e.g. Aanya Sharma"
                          aria-invalid={Boolean(errors.name)}
                          aria-describedby={errorId('checkout-name', errors.name)}
                          className={inputCls(errors.name)}
                        />
                      </Field>

                      <Field
                        id="checkout-phone"
                        label="Mobile Number"
                        required
                        error={errors.phone}
                        hint="Used only for order and delivery updates."
                      >
                        <div className="relative">
                          <span
                            className="pointer-events-none absolute inset-y-0 left-0 flex w-14 items-center justify-center border-r border-stone-200 text-sm font-semibold text-neutral-700"
                            aria-hidden="true"
                          >
                            +91
                          </span>
                          <input
                            id="checkout-phone"
                            name="phone"
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            maxLength={10}
                            disabled={processing}
                            value={form.phone}
                            onChange={(event) =>
                              setField('phone', sanitizePhoneFieldValue(event.target.value))
                            }
                            placeholder="10-digit mobile number"
                            aria-invalid={Boolean(errors.phone)}
                            aria-describedby={fieldDescriptionIds(
                              'checkout-phone',
                              errors.phone,
                              true
                            )}
                            className={cn(inputCls(errors.phone), 'pl-[4.5rem]')}
                          />
                        </div>
                      </Field>

                      <Field
                        id="checkout-email"
                        label="Email"
                        optional
                        error={errors.email}
                        className="sm:col-span-2"
                        hint="Used only for order and delivery updates."
                      >
                        <div className="relative">
                          <Mail
                            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                            aria-hidden="true"
                          />
                          <input
                            id="checkout-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            maxLength={254}
                            disabled={processing}
                            value={form.email}
                            onChange={(event) => setField('email', event.target.value)}
                            placeholder="aanya@example.com"
                            aria-invalid={Boolean(errors.email)}
                            aria-describedby={fieldDescriptionIds(
                              'checkout-email',
                              errors.email,
                              true
                            )}
                            className={cn(inputCls(errors.email), 'pl-10')}
                          />
                        </div>
                      </Field>
                    </div>
                  </div>

                  <div className="border-t border-stone-200/80 pt-7">
                    <SectionHeading icon={MapPin} title="Delivery address" />
                    <div className="mt-4 grid gap-5 sm:grid-cols-2">
                      <Field
                        id="checkout-line1"
                        label="House No., Building, Street and Area"
                        required
                        error={errors.line1}
                        className="sm:col-span-2"
                      >
                        <textarea
                          id="checkout-line1"
                          name="address-line1"
                          autoComplete="street-address"
                          rows={3}
                          maxLength={200}
                          disabled={processing}
                          value={form.line1}
                          onChange={(event) => setField('line1', event.target.value)}
                          placeholder="e.g. House or flat, building, street and area"
                          aria-invalid={Boolean(errors.line1)}
                          aria-describedby={errorId('checkout-line1', errors.line1)}
                          className={cn(inputCls(errors.line1), 'resize-none py-3')}
                        />
                      </Field>

                      <Field
                        id="checkout-line2"
                        label="Landmark"
                        optional
                        error={errors.line2}
                        className="sm:col-span-2"
                      >
                        <div className="relative">
                          <Building2
                            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                            aria-hidden="true"
                          />
                          <input
                            id="checkout-line2"
                            name="address-line2"
                            autoComplete="address-line2"
                            maxLength={200}
                            disabled={processing}
                            value={form.line2}
                            onChange={(event) => setField('line2', event.target.value)}
                            placeholder="e.g. Near Central Park"
                            aria-invalid={Boolean(errors.line2)}
                            aria-describedby={errorId('checkout-line2', errors.line2)}
                            className={cn(inputCls(errors.line2), 'pl-10')}
                          />
                        </div>
                      </Field>

                      <Field id="checkout-city" label="City" required error={errors.city}>
                        <input
                          id="checkout-city"
                          name="city"
                          autoComplete="address-level2"
                          maxLength={80}
                          disabled={processing}
                          value={form.city}
                          onChange={(event) => setField('city', event.target.value)}
                          placeholder="e.g. Khurja"
                          aria-invalid={Boolean(errors.city)}
                          aria-describedby={errorId('checkout-city', errors.city)}
                          className={inputCls(errors.city)}
                        />
                      </Field>

                      <Field id="checkout-state" label="State" required error={errors.state}>
                        <div className="relative">
                          <select
                            id="checkout-state"
                            name="state"
                            autoComplete="address-level1"
                            disabled={processing}
                            value={form.state}
                            onChange={(event) => setField('state', event.target.value)}
                            aria-invalid={Boolean(errors.state)}
                            aria-describedby={errorId('checkout-state', errors.state)}
                            className={cn(inputCls(errors.state), 'appearance-none pr-10')}
                          >
                            <option value="">Select state</option>
                            {indianStates.map((state) => (
                              <option key={state} value={state}>
                                {state}
                              </option>
                            ))}
                          </select>
                          <Navigation
                            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                            aria-hidden="true"
                          />
                        </div>
                      </Field>

                      <Field id="checkout-pincode" label="PIN Code" required error={errors.pincode}>
                        <input
                          id="checkout-pincode"
                          name="postal-code"
                          type="text"
                          inputMode="numeric"
                          autoComplete="postal-code"
                          maxLength={6}
                          disabled={processing}
                          value={form.pincode}
                          onChange={(event) =>
                            setField('pincode', sanitizePincode(event.target.value))
                          }
                          placeholder="e.g. 203131"
                          aria-invalid={Boolean(errors.pincode)}
                          aria-describedby={errorId('checkout-pincode', errors.pincode)}
                          className={inputCls(errors.pincode)}
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="border-t border-stone-200/80 pt-7">
                    <SectionHeading icon={FileText} title="Additional information" />
                    <div className="mt-4">
                      <Field id="checkout-notes" label="Order Notes" optional error={errors.notes}>
                        <textarea
                          id="checkout-notes"
                          name="notes"
                          rows={3}
                          maxLength={500}
                          disabled={processing}
                          value={form.notes}
                          onChange={(event) => setField('notes', event.target.value)}
                          placeholder="Any delivery instructions or a note for your order"
                          aria-invalid={Boolean(errors.notes)}
                          aria-describedby={fieldDescriptionIds(
                            'checkout-notes',
                            errors.notes,
                            true
                          )}
                          className={cn(inputCls(errors.notes), 'resize-none py-3')}
                        />
                        <p
                          id="checkout-notes-hint"
                          className="mt-1.5 text-right text-xs tabular-nums text-neutral-400"
                        >
                          {form.notes.length}/500
                        </p>
                      </Field>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[22px] border border-stone-200/90 bg-white p-5 shadow-[0_18px_55px_-46px_rgba(45,35,20,0.55)] sm:p-7">
                <div className="mb-5">
                  <SectionHeading icon={ShieldCheck} title="Payment" />
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    Your order will be placed only after successful payment.
                  </p>
                </div>

                <div className="space-y-3" aria-label="Available payment methods">
                  <PaymentMethodRow
                    active
                    icon={CreditCard}
                    title="Online payment"
                    description="UPI, cards, net banking and other payment methods supported by Razorpay"
                  />
                </div>

                <div className="mt-5 flex gap-3 border-t border-stone-200/80 pt-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-800">
                    <Lock className="h-[18px] w-[18px]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Secure online payment</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">
                      Secure online payments powered by Razorpay.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <aside className="lg:sticky lg:top-28">
              <section className="rounded-[22px] border border-stone-200/90 bg-white p-5 shadow-[0_22px_65px_-48px_rgba(45,35,20,0.62)] sm:p-6">
                <div className="flex items-center justify-between border-b border-stone-200/80 pb-4">
                  <h2 className="text-lg font-semibold text-neutral-950">Order summary</h2>
                  <span className="text-xs font-medium text-neutral-500">
                    {guest.reduce((count, item) => count + item.quantity, 0)} items
                  </span>
                </div>

                <div className="max-h-72 space-y-4 overflow-y-auto border-b border-stone-200/80 py-5 pr-1">
                  {guest.map((item) => (
                    <div key={item.product.id} className="flex gap-3.5">
                      <CheckoutProductImage
                        src={item.product.images?.[0] || '/placeholder.svg'}
                        alt={item.product.name}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium leading-5 text-neutral-900">
                          {item.product.name}
                        </p>
                        {item.product.category?.name && (
                          <p className="mt-0.5 text-xs text-neutral-400">
                            {item.product.category.name}
                          </p>
                        )}
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="text-xs text-neutral-500">Qty {item.quantity}</span>
                          <span className="text-sm font-semibold tabular-nums text-neutral-900">
                            {formatRupees(item.product.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-b border-stone-200/80 py-5">
                  {coupon ? (
                    <div className="flex min-h-12 items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <Tag className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-emerald-800">{coupon.code}</p>
                          <p className="text-[11px] text-emerald-700">
                            You save {formatRupees(discount)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCoupon(null)}
                        disabled={processing}
                        aria-label={`Remove coupon ${coupon.code}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <label htmlFor="checkout-coupon" className="sr-only">
                        Coupon code
                      </label>
                      <input
                        id="checkout-coupon"
                        value={couponCode}
                        onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                        placeholder="Coupon code"
                        disabled={processing}
                        className="min-h-11 min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3.5 text-sm uppercase outline-none transition-colors placeholder:normal-case placeholder:text-neutral-400 focus:border-gold-500 focus:ring-4 focus:ring-gold-100/70 disabled:bg-stone-50 disabled:text-neutral-400"
                      />
                      <button
                        type="button"
                        onClick={applyCoupon}
                        disabled={processing || !couponCode.trim()}
                        className="min-h-11 rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 focus-visible:ring-4 focus-visible:ring-gold-200 disabled:cursor-not-allowed disabled:bg-neutral-300"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-3 py-5">
                  <Row label="Subtotal" value={formatRupees(subtotal)} />
                  {discount > 0 && (
                    <Row
                      label={`Discount${coupon ? ` (${coupon.code})` : ''}`}
                      value={`- ${formatRupees(discount)}`}
                      className="text-emerald-700"
                    />
                  )}
                  <Row
                    label="Shipping"
                    value={
                      shipping === 0 ? (
                        <span className="font-semibold text-emerald-700">Free</span>
                      ) : (
                        formatRupees(shipping)
                      )
                    }
                  />
                </div>

                <div className="flex items-end justify-between border-t border-stone-200/80 pt-5">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">Total</p>
                    <p className="mt-0.5 text-xs text-neutral-400">Final amount shown before payment</p>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-neutral-950">
                    {formatRupees(total)}
                  </p>
                </div>

                {pendingCheckout && (
                  <p className="mt-4 rounded-xl bg-gold-50 px-3.5 py-3 text-xs leading-5 text-gold-900">
                    Your payment session is ready to continue without creating another order.
                  </p>
                )}

                <CheckoutButton processing={processing} className="mt-5 hidden lg:flex" />

                <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-neutral-500">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" aria-hidden="true" />
                  <span>Your order is confirmed only after Razorpay verifies a successful payment.</span>
                </div>
              </section>
            </aside>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_35px_-25px_rgba(30,24,15,0.5)] backdrop-blur-xl lg:hidden">
            <div className="mx-auto flex max-w-[1180px] items-center gap-3">
              <div className="min-w-[88px] shrink-0">
                <p className="text-[11px] font-medium text-neutral-500">Total</p>
                <p className="text-lg font-bold tabular-nums text-neutral-950">{formatRupees(total)}</p>
              </div>
              <CheckoutButton processing={processing} className="min-w-0 flex-1" />
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

function CheckoutProgress() {
  return (
    <nav className="w-full max-w-xs" aria-label="Checkout progress">
      <ol className="flex items-center">
        <li className="flex flex-1 items-center gap-2.5" aria-current="step">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-950 text-xs font-semibold text-white">
            1
          </span>
          <span className="text-sm font-semibold text-neutral-950">Delivery</span>
        </li>
        <li className="mx-3 h-px w-9 bg-stone-300" aria-hidden="true" />
        <li className="flex items-center gap-2.5 text-neutral-400">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 bg-white text-xs font-semibold">
            2
          </span>
          <span className="whitespace-nowrap text-sm font-medium">Review &amp; Pay</span>
        </li>
      </ol>
    </nav>
  );
}

function SectionHeading({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-50 text-gold-800">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  required = false,
  optional = false,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-neutral-800">
        {label}
        {required && (
          <span className="ml-1 text-red-600" aria-label="required">
            *
          </span>
        )}
        {optional && <span className="ml-1.5 text-xs font-normal text-neutral-400">(optional)</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs leading-5 text-neutral-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function PaymentMethodRow({
  active = false,
  icon: Icon,
  title,
  description,
}: {
  active?: boolean;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-[72px] items-center gap-3.5 rounded-xl border px-4 py-3.5',
        active && 'border-gold-300 bg-gold-50/60'
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          active ? 'bg-white text-gold-800 shadow-sm' : 'bg-stone-100 text-neutral-400'
        )}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-5 text-neutral-900">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-neutral-500">{description}</p>
      </div>
      {active && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white">
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex justify-between gap-4 text-sm text-neutral-600', className)}>
      <span className="min-w-0">{label}</span>
      <span className="shrink-0 font-medium tabular-nums text-current">{value}</span>
    </div>
  );
}

function CheckoutButton({ processing, className }: { processing: boolean; className?: string }) {
  return (
    <button
      type="submit"
      disabled={processing}
      aria-label={processing ? 'Preparing secure payment' : 'Proceed to secure payment'}
      className={cn(
        'min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-xs font-semibold text-white shadow-[0_16px_30px_-20px_rgba(0,0,0,0.75)] transition-colors hover:bg-neutral-800 focus-visible:ring-4 focus-visible:ring-gold-200 active:bg-black disabled:cursor-not-allowed disabled:bg-neutral-400 disabled:shadow-none sm:text-sm',
        className
      )}
    >
      {processing ? (
        <>
          <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          <span className="truncate">Preparing Secure Payment...</span>
        </>
      ) : (
        <>
          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">Proceed to Secure Payment</span>
          <ArrowRight className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden="true" />
        </>
      )}
    </button>
  );
}

function CheckoutProductImage({ src, alt }: { src: string; alt: string }) {
  const [imageSrc, setImageSrc] = useState(src);

  useEffect(() => {
    setImageSrc(src);
  }, [src]);

  return (
    <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
      <Image
        src={imageSrc}
        alt={alt}
        fill
        sizes="72px"
        className="object-cover"
        onError={() => setImageSrc('/placeholder.svg')}
      />
    </div>
  );
}

function errorId(id: string, error?: string) {
  return error ? `${id}-error` : undefined;
}

function fieldDescriptionIds(id: string, error?: string, hasHint = false) {
  return [hasHint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ') || undefined;
}

function inputCls(error?: string) {
  return cn(
    'min-h-12 w-full rounded-xl border bg-white px-3.5 text-[15px] text-neutral-950 shadow-[0_1px_0_rgba(30,24,15,0.03)] outline-none transition-colors placeholder:text-neutral-400 focus:ring-4 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-neutral-500',
    error
      ? 'border-red-400 focus:border-red-500 focus:ring-red-100/80'
      : 'border-stone-200 focus:border-gold-500 focus:ring-gold-100/70'
  );
}
