'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Check, Clock3, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatRupees } from '@/lib/utils';
import type { OrderSuccessSummary } from '@/types';
import {
  formatPaymentMethod,
  getPaymentSupportHref,
  isManualPaymentMethod,
} from '@/lib/manual-payment';

type OrderLookupResponse = {
  order?: OrderSuccessSummary;
  error?: string;
};

export default function OrderSuccessView() {
  const sp = useSearchParams();
  const router = useRouter();
  const lookupParam = sp.get('order') ?? sp.get('id');
  const [order, setOrder] = useState<OrderSuccessSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!lookupParam) {
      router.replace('/');
      return;
    }

    console.info('[order-success] lookup parameter', { lookupParam });

    fetch(`/api/orders/${encodeURIComponent(lookupParam)}`)
      .then(async (response) => {
        const data = (await response.json()) as OrderLookupResponse;
        console.info('[order-success] API response', {
          status: response.status,
          orderNumber: data.order?.order_number ?? null,
          paymentStatus: data.order?.payment_status ?? null,
          orderStatus: data.order?.order_status ?? null,
          error: data.error ?? null,
        });

        if (!response.ok || !data.order) {
          setError(data.error ?? 'Order not found.');
          setOrder(null);
          return;
        }

        setOrder(data.order);
        setError('');
      })
      .catch((fetchError) => {
        console.error('[order-success] order lookup failed', fetchError);
        setError('Could not load your order right now.');
        setOrder(null);
      })
      .finally(() => setLoading(false));
  }, [lookupParam, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gold-500 border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
            <AlertCircle className="h-10 w-10 text-amber-600" />
          </div>
          <h2 className="heading-display mb-3 text-2xl text-neutral-900 md:text-3xl">
            We couldn&apos;t load your order
          </h2>
          <p className="mb-6 text-sm text-neutral-500">
            {error || 'Order details are unavailable right now.'}
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/shop" className="btn-outline text-sm">
              Continue Shopping
            </Link>
            <Link href="/contact" className="btn-primary text-sm">
              Contact Support
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const isManual = isManualPaymentMethod(order.payment_method);
  const isManualPending = isManual && order.payment_status === 'pending';
  const isManualFailed = isManual && order.payment_status === 'failed';
  const supportHref = getPaymentSupportHref();

  const title = isManualPending
    ? 'Order placed — payment under review'
    : isManualFailed
      ? 'Payment verification was unsuccessful'
      : order.payment_status === 'paid'
        ? 'Payment verified — order confirmed'
        : 'Order placed!';

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-[#fcfaf7] px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: 'spring' }}
          className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
            isManualFailed
              ? 'bg-red-100'
              : isManualPending
                ? 'bg-amber-100'
                : 'bg-green-100'
          }`}
        >
          {isManualPending ? (
            <Clock3 className="h-10 w-10 text-amber-700" />
          ) : isManualFailed ? (
            <AlertCircle className="h-10 w-10 text-red-600" />
          ) : (
            <Check className="h-10 w-10 text-green-600" />
          )}
        </motion.div>

        <h1 className="heading-display mb-3 text-2xl text-neutral-950 md:text-3xl">{title}</h1>

        {isManualPending ? (
          <p className="mx-auto mb-6 max-w-md text-sm leading-6 text-neutral-600">
            We will verify your payment and confirm your order shortly. Your submitted reference is
            awaiting a manual check against the actual account credit.
          </p>
        ) : null}

        <div className="mb-6 rounded-2xl border border-neutral-100 bg-white p-5 text-left shadow-sm">
          <dl className="space-y-3 text-sm">
            <SummaryRow label="Order Number" value={order.order_number} />
            <SummaryRow label="Customer" value={order.customer_name} />
            <SummaryRow label="Amount" value={formatRupees(order.total)} />
            <SummaryRow label="Payment Method" value={formatPaymentMethod(order.payment_method)} />
            {isManual && order.manual_payment_reference ? (
              <SummaryRow label="UTR / Reference" value={order.manual_payment_reference} />
            ) : null}
            {isManual && order.manual_payment_sender_name ? (
              <SummaryRow label="Sender Name" value={order.manual_payment_sender_name} />
            ) : null}
            <SummaryRow label="Payment Status" value={order.payment_status.toUpperCase()} />
            <SummaryRow label="Order Status" value={order.order_status.toUpperCase()} />
          </dl>
        </div>

        {order.payment_method === 'cod' ? (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Pay {formatRupees(order.total)} in cash when your order is delivered.
          </p>
        ) : null}

        {isManualPending ? (
          <div className="mb-5 space-y-2 rounded-xl border border-gold-200 bg-gold-50 p-4 text-left text-xs leading-5 text-gold-900">
            <p>Please keep your payment screenshot until verification is complete.</p>
            <p>Orders are dispatched only after the payment is verified and the order is confirmed.</p>
          </div>
        ) : null}

        {isManualFailed ? (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-left text-xs leading-5 text-red-800">
            <p>
              The submitted payment could not be verified. Contact support with your order number before
              making another payment.
            </p>
            {order.manual_payment_rejected_reason ? (
              <p className="mt-2 font-semibold">Reason: {order.manual_payment_rejected_reason}</p>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href="/account" className="btn-primary text-sm">
            View My Orders
          </Link>
          <Link href="/shop" className="btn-outline text-sm">
            Continue Shopping
          </Link>
          {supportHref ? (
            <a
              href={supportHref}
              target={supportHref.startsWith('https://') ? '_blank' : undefined}
              rel={supportHref.startsWith('https://') ? 'noopener noreferrer' : undefined}
              className="btn-outline text-sm sm:col-span-2"
            >
              <MessageCircle className="h-4 w-4" />
              Payment Support
            </a>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-neutral-400">{label}</dt>
      <dd className="max-w-[60%] break-words text-right font-medium text-neutral-900">{value}</dd>
    </div>
  );
}
