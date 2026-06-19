'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle2, Copy, IndianRupee, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import type { OrderSuccessSummary } from '@/types';
import { buildUpiIntentUrl, manualPaymentConfig } from '@/lib/manual-payment';

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
  const [showFallback, setShowFallback] = useState(false);
  const [desktopFallback, setDesktopFallback] = useState(false);
  const [qrAvailable, setQrAvailable] = useState(true);
  const attemptedOpenRef = useRef(false);
  const leftPageRef = useRef(false);
  const navigatedRef = useRef(false);

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

  const paymentNote = order ? `Gridaan Order ${order.order_number}` : '';

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

  function goToOrderStatus() {
    if (!order || navigatedRef.current) return;
    navigatedRef.current = true;
    router.push(`/order-success?orderId=${encodeURIComponent(order.id)}&payment=pending`);
  }

  function openUpiApp() {
    if (!upiIntentUrl) {
      toast.error('UPI payment is not available right now');
      setShowFallback(true);
      return;
    }

    attemptedOpenRef.current = true;
    window.location.href = upiIntentUrl;
  }

  useEffect(() => {
    if (!order || !upiIntentUrl || attemptedOpenRef.current) return;

    const openTimer = window.setTimeout(openUpiApp, 900);
    const fallbackTimer = window.setTimeout(() => {
      if (!leftPageRef.current && !navigatedRef.current) {
        setDesktopFallback(true);
        setShowFallback(true);
      }
    }, 4500);

    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(fallbackTimer);
    };
    // openUpiApp intentionally reads the latest intent URL and order state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, upiIntentUrl]);

  useEffect(() => {
    function scheduleReturn() {
      if (!leftPageRef.current || !attemptedOpenRef.current || navigatedRef.current) return;
      window.setTimeout(goToOrderStatus, 900);
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        leftPageRef.current = true;
        return;
      }
      scheduleReturn();
    }

    function handlePageHide() {
      leftPageRef.current = true;
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', scheduleReturn);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', scheduleReturn);
      window.removeEventListener('pagehide', handlePageHide);
    };
    // goToOrderStatus is stable enough for this page lifecycle listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
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
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
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

  return (
    <main className="flex min-h-screen bg-white px-5 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center text-center">
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
          ORDER {order.order_number}
        </p>
        <h1 className="heading-display text-3xl text-neutral-950 md:text-4xl">
          Processing payment…
        </h1>
        <p className="mt-4 max-w-xs text-sm leading-6 text-neutral-500">
          Redirecting to your UPI app. Please do not press back.
        </p>

        <div className="mt-12 w-full">
          {!showFallback ? (
            <button
              type="button"
              onClick={() => setShowFallback(true)}
              className="text-xs font-semibold text-neutral-400 underline underline-offset-4 transition-colors hover:text-neutral-900"
            >
              UPI app not opening?
            </button>
          ) : (
            <div className="rounded-3xl border border-neutral-100 bg-[#fbfaf8] p-4 text-left shadow-sm">
              {desktopFallback ? (
                <p className="mb-3 rounded-full bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800">
                  Using desktop? Scan QR to pay.
                </p>
              ) : null}
              <p className="text-sm font-semibold text-neutral-950">Pay another way</p>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Scan the QR or copy the UPI ID. Your order will be verified manually.
              </p>

              <button
                type="button"
                onClick={openUpiApp}
                disabled={!upiIntentUrl}
                className="btn-primary mt-4 w-full justify-center py-3 text-sm disabled:opacity-50"
              >
                Open UPI App
              </button>

              {qrAvailable ? (
                <div className="mx-auto mt-4 max-w-40 rounded-2xl border border-neutral-100 bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/payment/upi-qr.png"
                    alt="Gridaan UPI QR code"
                    className="aspect-square w-full object-contain"
                    onError={() => setQrAvailable(false)}
                  />
                </div>
              ) : null}

              <div className="mt-4 space-y-2">
                {manualPaymentConfig.upiId ? (
                  <FallbackCopyButton
                    label="UPI ID"
                    value={manualPaymentConfig.upiId}
                    onCopy={() => copyValue(manualPaymentConfig.upiId!, 'UPI ID')}
                  />
                ) : null}
                <FallbackCopyButton
                  label="Payment Note"
                  value={paymentNote}
                  onCopy={() => copyValue(paymentNote, 'Payment note')}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function FallbackCopyButton({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-neutral-100 bg-white px-4 py-3 text-left"
    >
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
          {label}
        </span>
        <span className="block truncate text-sm font-semibold text-neutral-950">{value}</span>
      </span>
      <Copy className="h-4 w-4 shrink-0 text-neutral-500" />
    </button>
  );
}
