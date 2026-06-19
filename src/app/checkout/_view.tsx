'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Banknote,
  Building2,
  CheckCircle2,
  Copy,
  Lock,
  QrCode,
  ShieldCheck,
  Tag,
  X,
  type LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '@/store/cart';
import { useUI } from '@/store/ui';
import { formatRupees, cn } from '@/lib/utils';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from '@/lib/config';
import type { Coupon, OrderSuccessSummary, PaymentMethod } from '@/types';
import { createClient } from '@/lib/supabase/client';
import {
  bankTransferAvailable,
  getPaymentSupportHref,
  manualPaymentConfig,
  manualUpiAvailable,
} from '@/lib/manual-payment';

type OrderApiResponse = {
  order?: OrderSuccessSummary;
  error?: string;
};

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
  const [payment, setPayment] = useState<PaymentMethod>('cod');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
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
  const paymentSupportHref = getPaymentSupportHref();

  function setField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  }

  function selectPayment(method: PaymentMethod) {
    setPayment(method);
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

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
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
      console.info('[checkout] selected payment method', { paymentMethod: payment });

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
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
          payment_method: payment,
          coupon_code: coupon?.code,
          notes: form.notes,
          items: guest.map((g) => ({ product_id: g.product.id, quantity: g.quantity })),
        }),
      });
      const data = (await res.json()) as OrderApiResponse;
      console.info('[checkout] app order creation response', {
        status: res.status,
        orderNumber: data.order?.order_number ?? null,
        error: data.error ?? null,
      });
      if (!res.ok) {
        toast.error(data.error ?? 'Could not place order');
        setProcessing(false);
        return;
      }
      const { order } = data;
      if (!order?.order_number) {
        toast.error('Order created, but confirmation could not be prepared.');
        setProcessing(false);
        return;
      }

      clear();
      setSearchQuery('');
      startTransition(() => {
        if (payment === 'manual_upi') {
          router.push(`/payment/upi-redirect?order=${encodeURIComponent(order.id)}`);
          return;
        }
        if (payment === 'bank_transfer') {
          router.push(`/order-success?orderId=${encodeURIComponent(order.id)}&payment=pending`);
          return;
        }
        router.push(`/order-success?order=${encodeURIComponent(order.order_number)}`);
      });
    } catch (error) {
      console.error('[checkout] placeOrder failed', error);
      toast.error('Network error');
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
                  Your payment is verified manually before dispatch.
                </p>
              </div>
              <div className="space-y-3">
                <PayOption
                  active={payment === 'cod'}
                  onClick={() => selectPayment('cod')}
                  icon={Banknote}
                  title="Cash on Delivery"
                  desc="Pay in cash when your order arrives"
                />
                {manualUpiAvailable ? (
                  <PayOption
                    active={payment === 'manual_upi'}
                    onClick={() => selectPayment('manual_upi')}
                    icon={QrCode}
                    title="Pay with any UPI app"
                    desc="Paytm, PhonePe, Google Pay, BHIM and other UPI apps supported"
                  />
                ) : null}
                {bankTransferAvailable ? (
                  <PayOption
                    active={payment === 'bank_transfer'}
                    onClick={() => selectPayment('bank_transfer')}
                    icon={Building2}
                    title="Bank Transfer"
                    desc="Place the order, then transfer using the order number as payment note"
                  />
                ) : null}
              </div>

              {payment === 'manual_upi' && manualUpiAvailable ? (
                <div className="mt-5 rounded-2xl border border-gold-200 bg-gold-50/70 p-5">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-gold-700 shadow-sm">
                      <QrCode className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">Fast UPI redirect</p>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        We will create your pending order first, then open your UPI app with the exact
                        amount and order number filled in. Payment is verified manually before dispatch.
                      </p>
                      <p className="mt-3 text-xs font-medium text-gold-900">
                        Please do not close the page until your order number is saved.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {payment === 'bank_transfer' && bankTransferAvailable ? (
                <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-5">
                  <p className="text-sm font-semibold text-neutral-900">Bank transfer details</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    Place the order first, then transfer the exact total. Use the order number shown on
                    the next page as your payment note. Orders are confirmed only after bank credit is
                    verified.
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {manualPaymentConfig.bankAccountName ? (
                      <PaymentDetail label="Account Name" value={manualPaymentConfig.bankAccountName} />
                    ) : null}
                    {manualPaymentConfig.bankAccountNumber ? (
                      <PaymentDetail
                        label="Account Number"
                        value={manualPaymentConfig.bankAccountNumber}
                        onCopy={() =>
                          copyValue(manualPaymentConfig.bankAccountNumber!, 'Account number')
                        }
                      />
                    ) : null}
                    {manualPaymentConfig.bankIfsc ? (
                      <PaymentDetail
                        label="IFSC"
                        value={manualPaymentConfig.bankIfsc}
                        onCopy={() => copyValue(manualPaymentConfig.bankIfsc!, 'IFSC')}
                      />
                    ) : null}
                    {manualPaymentConfig.bankName ? (
                      <PaymentDetail label="Bank Name" value={manualPaymentConfig.bankName} />
                    ) : null}
                    {manualPaymentConfig.bankBranch ? (
                      <PaymentDetail label="Branch" value={manualPaymentConfig.bankBranch} />
                    ) : null}
                    <PaymentDetail label="Amount" value={formatRupees(total)} />
                  </div>
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                    Your order number becomes the payment note after checkout, for example:
                    <span className="font-semibold"> Gridaan Order GR-0000001</span>.
                  </div>
                </div>
              ) : null}

              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Orders are confirmed only after payment verification.</p>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  UPI and bank-transfer payments stay pending until our team verifies actual account
                  credit. We never mark a manual payment as paid automatically.
                </p>
                {paymentSupportHref ? (
                  <a
                    href={paymentSupportHref}
                    target={paymentSupportHref.startsWith('https://') ? '_blank' : undefined}
                    rel={paymentSupportHref.startsWith('https://') ? 'noopener noreferrer' : undefined}
                    className="mt-2 inline-flex font-semibold underline underline-offset-4"
                  >
                    Need help? Contact us.
                  </a>
                ) : null}
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
                  payment === 'manual_upi'
                    ? `Pay ${formatRupees(total)} via UPI`
                    : `${payment === 'cod' ? 'Place Order' : 'Place Bank Transfer Order'} — ${formatRupees(total)}`
                )}
              </button>

              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-neutral-500">
                {[
                  { icon: Banknote, label: 'COD Available' },
                  ...(manualUpiAvailable ? [{ icon: QrCode, label: 'UPI Accepted' }] : []),
                  ...(bankTransferAvailable
                    ? [{ icon: Building2, label: 'Bank Transfer' }]
                    : []),
                  { icon: CheckCircle2, label: 'Manual Verification' },
                  { icon: ShieldCheck, label: 'Secure Order Tracking' },
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

function PayOption({ active, onClick, icon: Icon, title, desc }: { active: boolean; onClick: () => void; icon: LucideIcon; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
        active ? 'border-gold-500 bg-gold-50' : 'border-neutral-200 hover:border-neutral-300'
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

function PaymentDetail({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-400">{label}</p>
        <p className="truncate text-sm font-semibold text-neutral-900">{value}</p>
      </div>
      {onCopy ? (
        <button
          type="button"
          onClick={onCopy}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-stone-100 hover:text-neutral-900"
          aria-label={`Copy ${label}`}
        >
          <Copy className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function inputCls(error?: string) {
  return cn(
    'w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all',
    error ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100' : 'border-neutral-200 focus:border-gold-400 focus:ring-2 focus:ring-gold-100'
  );
}
