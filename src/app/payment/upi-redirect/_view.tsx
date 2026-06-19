'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  IndianRupee,
  MessageCircle,
  Smartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatRupees } from '@/lib/utils';
import type { OrderSuccessSummary } from '@/types';
import {
  buildUpiIntentUrl,
  getPaymentSupportHref,
  manualPaymentConfig,
} from '@/lib/manual-payment';

type OrderLookupResponse = {
  order?: OrderSuccessSummary;
  error?: string;
};

export default function UpiRedirectView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('order');
  const [order, setOrder] = useState<OrderSuccessSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attemptedOpen, setAttemptedOpen] = useState(false);
  const [returnedFromApp, setReturnedFromApp] = useState(false);
  const [qrAvailable, setQrAvailable] = useState(true);
  const attemptedRef = useRef(false);
  const leftPageRef = useRef(false);
  const supportHref = getPaymentSupportHref();

  useEffect(() => {
    if (!orderId) {
      setError('Order details are missing.');
      setLoading(false);
      return;
    }

    fetch(`/api/orders/${encodeURIComponent(orderId)}`)
      .then(async (response) => {
        const data = (await response.json()) as OrderLookupResponse;
        if (!response.ok || !data.order) {
          setError(data.error ?? 'Could not load this order.');
          return;
        }
        setOrder(data.order);
      })
      .catch(() => setError('Could not load this order right now.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const upiIntentUrl = useMemo(() => {
    if (!order || !manualPaymentConfig.upiId) return null;
    try {
      return buildUpiIntentUrl({
        upiId: manualPaymentConfig.upiId,
        payeeName: manualPaymentConfig.upiName ?? 'Gridaan',
        amount: order.total,
        orderNumber: order.order_number,
      });
    } catch {
      return null;
    }
  }, [order]);

  useEffect(() => {
    if (!order || !upiIntentUrl || attemptedRef.current) return;

    attemptedRef.current = true;
    const timeout = window.setTimeout(() => {
      setAttemptedOpen(true);
      window.location.href = upiIntentUrl;
    }, 1100);

    return () => window.clearTimeout(timeout);
  }, [order, upiIntentUrl]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        leftPageRef.current = true;
        return;
      }
      if (leftPageRef.current && attemptedRef.current) {
        setReturnedFromApp(true);
      }
    }

    function handleFocus() {
      if (leftPageRef.current && attemptedRef.current) {
        setReturnedFromApp(true);
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  function openUpiApp() {
    if (!upiIntentUrl) {
      toast.error('UPI payment is not available right now');
      return;
    }
    setAttemptedOpen(true);
    window.location.href = upiIntentUrl;
  }

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  }

  function goToOrderStatus() {
    if (!order) return;
    router.push(`/order-success?orderId=${encodeURIComponent(order.id)}&payment=pending`);
  }

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-white px-4">
        <div className="max-w-md text-center">
          <h1 className="heading-display text-2xl text-neutral-950">Payment could not start</h1>
          <p className="mt-3 text-sm text-neutral-500">
            {error || 'We could not load the order details for this payment.'}
          </p>
          <Link href="/checkout" className="btn-primary mt-6 text-sm">
            Back to Checkout
          </Link>
        </div>
      </div>
    );
  }

  if (order.payment_method !== 'manual_upi') {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-white px-4">
        <div className="max-w-md text-center">
          <h1 className="heading-display text-2xl text-neutral-950">This is not a UPI order</h1>
          <p className="mt-3 text-sm text-neutral-500">
            Continue to your order status page for the latest confirmation details.
          </p>
          <button onClick={goToOrderStatus} className="btn-primary mt-6 text-sm">
            View Order Status
          </button>
        </div>
      </div>
    );
  }

  const paymentNote = `Gridaan Order ${order.order_number}`;

  return (
    <div className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto flex min-h-[78vh] max-w-xl flex-col items-center justify-center text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-gold-100 blur-2xl" />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-neutral-950 text-white shadow-xl">
            <IndianRupee className="h-10 w-10" />
            <ArrowRight className="mx-1 h-5 w-5 text-gold-300" />
            <Smartphone className="h-10 w-10 text-gold-200" />
          </div>
          <div className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-green-500 text-white shadow-lg">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-700">
          Order {order.order_number}
        </p>
        <h1 className="heading-display text-3xl text-neutral-950 md:text-4xl">
          Processing payment…
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-6 text-neutral-500">
          Redirecting to your UPI App. Please do not press back button.
        </p>

        <div className="mt-7 w-full rounded-3xl border border-neutral-100 bg-[#fbfaf8] p-5 text-left shadow-sm">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-neutral-500">Amount</span>
            <span className="font-bold text-neutral-950">{formatRupees(order.total)}</span>
          </div>
          <div className="mt-3 flex items-start justify-between gap-4 text-sm">
            <span className="text-neutral-500">Payment Note</span>
            <span className="max-w-[60%] break-words text-right font-semibold text-neutral-950">
              {paymentNote}
            </span>
          </div>
        </div>

        <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={openUpiApp}
            disabled={!upiIntentUrl}
            className="btn-primary justify-center py-3 text-sm disabled:opacity-50"
          >
            Open UPI App
          </button>
          <button
            type="button"
            onClick={goToOrderStatus}
            className="btn-outline justify-center py-3 text-sm"
          >
            I have completed payment
          </button>
        </div>

        {returnedFromApp || attemptedOpen ? (
          <p className="mt-4 rounded-full bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
            Payment app closed. Continue to order status when you are done.
          </p>
        ) : null}

        <div className="mt-8 w-full rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm md:hidden">
          <p className="text-sm font-semibold text-neutral-950">Desktop or QR fallback</p>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            If your UPI app does not open, use this QR or copy the UPI ID.
          </p>
          {qrAvailable ? (
            <div className="mx-auto mt-4 max-w-44 rounded-2xl border border-neutral-100 bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/payment/upi-qr.png"
                alt="Gridaan UPI QR code"
                className="aspect-square w-full object-contain"
                onError={() => setQrAvailable(false)}
              />
            </div>
          ) : null}
          {manualPaymentConfig.upiId ? (
            <button
              type="button"
              onClick={() => copyValue(manualPaymentConfig.upiId!, 'UPI ID')}
              className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-neutral-100 bg-[#fbfaf8] px-4 py-3 text-left"
            >
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                  UPI ID
                </span>
                <span className="block truncate text-sm font-semibold text-neutral-950">
                  {manualPaymentConfig.upiId}
                </span>
              </span>
              <Copy className="h-4 w-4 shrink-0 text-neutral-500" />
            </button>
          ) : null}
        </div>

        <div className="mt-8 hidden w-full rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm md:block">
          <p className="text-sm font-semibold text-neutral-950">Desktop fallback</p>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            UPI app redirects work best on mobile. On desktop, scan the QR or copy the UPI ID
            and use the payment note above.
          </p>
          <div className="mt-4 grid items-center gap-5 sm:grid-cols-[9rem_1fr]">
            {qrAvailable ? (
              <div className="rounded-2xl border border-neutral-100 bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/payment/upi-qr.png"
                  alt="Gridaan UPI QR code"
                  className="aspect-square w-full object-contain"
                  onError={() => setQrAvailable(false)}
                />
              </div>
            ) : null}
            <div className="space-y-3">
              {manualPaymentConfig.upiId ? (
                <button
                  type="button"
                  onClick={() => copyValue(manualPaymentConfig.upiId!, 'UPI ID')}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-neutral-100 bg-[#fbfaf8] px-4 py-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                      UPI ID
                    </span>
                    <span className="block truncate text-sm font-semibold text-neutral-950">
                      {manualPaymentConfig.upiId}
                    </span>
                  </span>
                  <Copy className="h-4 w-4 shrink-0 text-neutral-500" />
                </button>
              ) : null}
              <div className="rounded-2xl border border-neutral-100 bg-[#fbfaf8] px-4 py-3 text-left">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                  Payment Note
                </span>
                <span className="block text-sm font-semibold text-neutral-950">{paymentNote}</span>
              </div>
            </div>
          </div>
        </div>

        {supportHref ? (
          <a
            href={supportHref}
            target={supportHref.startsWith('https://') ? '_blank' : undefined}
            rel={supportHref.startsWith('https://') ? 'noopener noreferrer' : undefined}
            className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 underline underline-offset-4 hover:text-neutral-900"
          >
            <MessageCircle className="h-4 w-4" />
            Need help with payment?
          </a>
        ) : null}
      </div>
    </div>
  );
}
