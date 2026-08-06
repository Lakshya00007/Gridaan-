'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Lock,
  ShieldCheck,
  Tag,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/store/cart';
import { useUI } from '@/store/ui';
import { formatRupees, cn } from '@/lib/utils';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from '@/lib/config';
import type { Coupon, OrderSuccessSummary } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { publicEnv } from '@/lib/env.public';

type OrderApiResponse = {
  checkout?: RazorpayCheckoutPayload;
  order?: OrderSuccessSummary;
  error?: string;
  message?: string;
  request_id?: string;
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

export default function CheckoutView() {
  const router = useRouter();
  const { guest, clear } = useCart();
  const { setSearchQuery } = useUI();
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<RazorpayCheckoutPayload | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    notes: '',
  });

  useEffect(() => {
    setMounted(true);
    const storedCheckout = window.localStorage.getItem('gridaan-pending-checkout');
    if (storedCheckout) {
      try {
        setPendingCheckout(JSON.parse(storedCheckout) as RazorpayCheckoutPayload);
      } catch {
        window.localStorage.removeItem('gridaan-pending-checkout');
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
                phone: f.phone || profile.phone || '',
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

  function setField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.phone.match(/^[6-9]\d{9}$/)) e.phone = 'Valid 10-digit Indian mobile required';
    if (form.email && !form.email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) e.email = 'Invalid email';
    if (!form.line1.trim()) e.line1 = 'Address is required';
    if (!form.city.trim()) e.city = 'City is required';
    if (!form.state) e.state = 'State is required';
    if (!form.pincode.match(/^\d{6}$/)) e.pincode = 'PIN must be 6 digits';
    setErrors(e);
    return Object.keys(e).length === 0;
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
    const storageKey = 'gridaan-razorpay-checkout-key';
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;
    const key = `checkout:${crypto.randomUUID()}`;
    window.localStorage.setItem(storageKey, key);
    return key;
  }

  function clearCheckoutIdempotencyKey() {
    window.localStorage.removeItem('gridaan-razorpay-checkout-key');
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

  async function retryPendingPayment(checkout: RazorpayCheckoutPayload) {
    const scriptLoaded = await loadRazorpayCheckout();
    if (!scriptLoaded || !window.Razorpay) {
      toast.error('Could not load Razorpay Checkout. Please try again.');
      setProcessing(false);
      return;
    }

    const retryKey = `retry:${crypto.randomUUID()}`;
    const response = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': retryKey },
      body: JSON.stringify({
        order_id: checkout.order_id,
        checkout_reference: checkout.checkout_reference,
        idempotency_key: retryKey,
      }),
    });
    const data = await response.json() as {
      payment?: { id: string };
      attempt?: { id: string; expires_at?: string | null };
      provider_order?: { gatewayOrderId: string; amountPaise: number; currency: 'INR' };
      error?: string;
    };
    if (!response.ok || !data.provider_order?.gatewayOrderId) {
      toast.error(data.error ?? 'Could not retry payment');
      setProcessing(false);
      return;
    }

    const nextCheckout: RazorpayCheckoutPayload = {
      ...checkout,
      payment_id: data.payment?.id ?? checkout.payment_id,
      attempt_id: data.attempt?.id ?? checkout.attempt_id,
      razorpay_order_id: data.provider_order.gatewayOrderId,
      amount: data.provider_order.amountPaise,
      currency: data.provider_order.currency,
      expires_at: data.attempt?.expires_at ?? checkout.expires_at,
    };
    setPendingCheckout(nextCheckout);
    window.localStorage.setItem('gridaan-pending-checkout', JSON.stringify(nextCheckout));
    openRazorpayCheckout(nextCheckout);
  }

  function openRazorpayCheckout(checkout: RazorpayCheckoutPayload) {
    if (!checkout.key && !publicEnv.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      toast.error('Razorpay key is not configured');
      setProcessing(false);
      return;
    }

    const Razorpay = window.Razorpay;
    if (!Razorpay) {
      toast.error('Razorpay Checkout is unavailable');
      setProcessing(false);
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
          setPendingCheckout(checkout);
          setProcessing(false);
          toast.message('Payment was not completed. You can retry without creating a duplicate order.');
        },
      },
      handler: async (response) => {
        try {
          const verified = await verifyRazorpayPayment(checkout, response);
          if (!verified.placed || !verified.order?.order_number) {
            setPendingCheckout(checkout);
            setProcessing(false);
            toast.message('Payment is being verified. Your order is not placed yet.');
            return;
          }

          clear();
          setSearchQuery('');
          clearCheckoutIdempotencyKey();
          window.localStorage.removeItem('gridaan-pending-checkout');
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
          setPendingCheckout(checkout);
          setProcessing(false);
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
      setProcessing(false);
      toast.error(message);
    });

    razorpay.open();
  }

  async function placeOrder() {
    if (processing) return;
    if (!validate()) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    if (guest.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    setProcessing(true);
    try {
      if (pendingCheckout) {
        await retryPendingPayment(pendingCheckout);
        return;
      }
      const scriptLoaded = await loadRazorpayCheckout();
      if (!scriptLoaded || !window.Razorpay) {
        toast.error('Could not load Razorpay Checkout. Please try again.');
        setProcessing(false);
        return;
      }
      const idempotencyKey = getCheckoutIdempotencyKey();
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
        body: JSON.stringify({
          customer_name: form.name,
          customer_email: form.email,
          customer_phone: form.phone,
          shipping_address: {
            full_name: form.name,
            phone: form.phone,
            line1: form.line1,
            line2: form.line2 || undefined,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
            country: 'India',
          },
          payment_method: 'razorpay',
          coupon_code: coupon?.code,
          notes: form.notes,
          items: guest.map((g) => ({ product_id: g.product.id, quantity: g.quantity })),
        }),
      });
      const data = (await res.json()) as OrderApiResponse;
      if (!res.ok) {
        if (data.error === 'idempotency_conflict') clearCheckoutIdempotencyKey();
        toast.error(data.message ?? data.error ?? 'Could not start payment');
        setProcessing(false);
        return;
      }
      if (!data.checkout?.razorpay_order_id) {
        toast.error('Payment could not be prepared.');
        setProcessing(false);
        return;
      }

      setPendingCheckout(data.checkout);
      window.localStorage.setItem('gridaan-pending-checkout', JSON.stringify(data.checkout));
      openRazorpayCheckout(data.checkout);
    } catch (error) {
      console.error('[checkout] placeOrder failed', error);
      toast.error(error instanceof Error ? error.message : 'Network error');
      setProcessing(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="bg-white border-b border-neutral-100">
        <div className="container py-4">
          <Link href="/shop" className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Continue Shopping
          </Link>
        </div>
      </div>

      <div className="container py-8 md:py-12">
        <h1 className="heading-display text-2xl md:text-3xl text-neutral-900 mb-8 text-center">Checkout</h1>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-6">Delivery Information</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full Name *" error={errors.name}>
                  <input
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="Your full name"
                    className={inputCls(errors.name)}
                  />
                </Field>
                <Field label="Mobile Number *" error={errors.phone}>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile"
                    className={inputCls(errors.phone)}
                  />
                </Field>
                <Field label="Email" error={errors.email} className="sm:col-span-2">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    placeholder="optional"
                    className={inputCls(errors.email)}
                  />
                </Field>
                <Field label="Address *" error={errors.line1} className="sm:col-span-2">
                  <textarea
                    value={form.line1}
                    onChange={(e) => setField('line1', e.target.value)}
                    placeholder="House/Flat, Street, Locality"
                    rows={2}
                    className={cn(inputCls(errors.line1), 'resize-none')}
                  />
                </Field>
                <Field label="City *" error={errors.city}>
                  <input value={form.city} onChange={(e) => setField('city', e.target.value)} placeholder="City" className={inputCls(errors.city)} />
                </Field>
                <Field label="State *" error={errors.state}>
                  <select value={form.state} onChange={(e) => setField('state', e.target.value)} className={inputCls(errors.state)}>
                    <option value="">Select state</option>
                    {indianStates.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="PIN Code *" error={errors.pincode}>
                  <input
                    value={form.pincode}
                    onChange={(e) => setField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit"
                    className={inputCls(errors.pincode)}
                  />
                </Field>
                <Field label="Order Notes (optional)" className="sm:col-span-2">
                  <textarea
                    value={form.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                    placeholder="Any special instructions"
                    rows={2}
                    className={cn(inputCls(), 'resize-none')}
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Payment Method</h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Your order will be placed only after successful payment.
                </p>
              </div>
              <div className="space-y-3">
                <PayOption
                  active
                  onClick={() => undefined}
                  icon={CreditCard}
                  title="Online Payment — UPI, Cards, Net Banking and Wallets"
                  desc="Secure payment powered by Razorpay"
                />
                <PayOption
                  active={false}
                  disabled
                  onClick={() => undefined}
                  icon={Banknote}
                  title="Cash on Delivery — Unavailable"
                  desc="Gridaan is online-payment-only"
                />
              </div>

              <div className="mt-5 rounded-xl border border-gold-200 bg-gold-50 p-4 text-sm text-gold-900">
                <p className="font-semibold">Your order will be placed only after successful payment.</p>
                <p className="mt-1 text-xs leading-5 text-gold-800">
                  If checkout is closed, fails, or cannot be verified, no order number is generated and no order is placed.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
              <h3 className="text-lg font-semibold mb-6">Order Summary</h3>
              <div className="space-y-4 mb-6 pb-6 border-b border-neutral-100">
                {guest.map((item) => (
                  <div key={item.product.id} className="flex gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.product.images?.[0] || '/placeholder.svg'} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{item.product.name}</p>
                      <p className="text-xs text-neutral-400">Qty: {item.quantity}</p>
                      <p className="text-sm font-semibold mt-0.5">{formatRupees(item.product.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-6 pb-6 border-b border-neutral-100">
                {coupon ? (
                  <div className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">{coupon.code}</span>
                      <span className="text-xs text-green-600">- {formatRupees(discount)}</span>
                    </div>
                    <button onClick={() => setCoupon(null)} aria-label="Remove coupon">
                      <X className="w-4 h-4 text-green-600" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-sm outline-none focus:border-gold-400"
                    />
                    <button
                      onClick={applyCoupon}
                      className="px-4 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-medium hover:bg-neutral-800"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2.5 mb-6">
                <Row label="Subtotal" value={formatRupees(subtotal)} />
                {discount > 0 && <Row label="Discount" value={`- ${formatRupees(discount)}`} className="text-green-600" />}
                <Row label="Shipping" value={shipping === 0 ? <span className="text-green-600">FREE</span> : formatRupees(shipping)} />
                <div className="flex justify-between text-base pt-2.5 border-t border-neutral-100">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">{formatRupees(total)}</span>
                </div>
              </div>

              <button
                onClick={placeOrder}
                disabled={processing}
                className="w-full btn-primary py-4 text-base font-semibold"
              >
                {processing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Processing…
                  </span>
                ) : (
                  `${pendingCheckout ? 'Retry Payment' : 'Pay & Place Order'} — ${formatRupees(total)}`
                )}
              </button>

              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-neutral-500">
                {[
                  { icon: CreditCard, label: 'Razorpay Checkout' },
                  { icon: Banknote, label: 'COD Unavailable' },
                  { icon: ShieldCheck, label: 'Verified Online Payment' },
                  { icon: Lock, label: 'SSL Secured' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-gold-600" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-neutral-500 mb-1.5 block">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function PayOption({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  title: string;
  desc: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
        active ? 'border-gold-500 bg-gold-50' : 'border-neutral-200 hover:border-neutral-300',
        disabled && 'cursor-not-allowed bg-neutral-50 text-neutral-400 hover:border-neutral-200'
      )}
    >
      <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center', active ? 'border-gold-500' : 'border-neutral-300')}>
        {active && <div className="w-3 h-3 bg-gold-500 rounded-full" />}
      </div>
      <Icon className="w-5 h-5 text-neutral-500" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-neutral-400">{desc}</p>
      </div>
    </button>
  );
}

function Row({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex justify-between text-sm', className)}>
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function inputCls(error?: string) {
  return cn(
    'w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all',
    error ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100' : 'border-neutral-200 focus:border-gold-400 focus:ring-2 focus:ring-gold-100'
  );
}
