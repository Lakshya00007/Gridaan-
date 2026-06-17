'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Loader2, RotateCcw, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatRupees } from '@/lib/utils';
import type { OrderSuccessSummary } from '@/types';
import {
  getRazorpayKeyId,
  loadRzpScript,
  type RazorpayCheckoutResponse,
  type RazorpayOrder,
} from '@/lib/razorpay-client';

type OrderLookupResponse = {
  order?: OrderSuccessSummary;
  rzp_order?: RazorpayOrder;
  rzp_key?: string;
  ok?: boolean;
  error?: string;
};

export default function OrderSuccessView() {
  const sp = useSearchParams();
  const router = useRouter();
  const lookupParam = sp.get('order') ?? sp.get('id');
  const [order, setOrder] = useState<OrderSuccessSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);

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

  async function retryPayment() {
    if (!order) return;
    setRetrying(true);

    try {
      const keyId = getRazorpayKeyId();
      if (!keyId) {
        toast.error('Razorpay is not configured right now.');
        setRetrying(false);
        return;
      }

      const scriptLoaded = await loadRzpScript();
      console.info('[order-success] Razorpay script load result', { scriptLoaded });
      if (!scriptLoaded || !window.Razorpay) {
        toast.error('Razorpay checkout could not load. Please try again later.');
        setRetrying(false);
        return;
      }

      const response = await fetch(`/api/orders/${encodeURIComponent(order.order_number)}/razorpay`, {
        method: 'POST',
      });
      const data = (await response.json()) as OrderLookupResponse;
      console.info('[order-success] Razorpay create order response', {
        status: response.status,
        orderNumber: data.order?.order_number ?? order.order_number,
        razorpayOrderId: data.rzp_order?.id ?? null,
        error: data.error ?? null,
      });

      if (!response.ok || !data.rzp_order || !data.rzp_key) {
        toast.error(data.error ?? 'Could not start Razorpay payment.');
        setRetrying(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: data.rzp_key,
        amount: data.rzp_order.amount,
        currency: 'INR',
        name: 'Gridaan',
        description: `Payment for ${order.order_number}`,
        order_id: data.rzp_order.id,
        handler: async (payment: RazorpayCheckoutResponse) => {
          const verify = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              order_id: order.id,
              razorpay_order_id: payment.razorpay_order_id,
              razorpay_payment_id: payment.razorpay_payment_id,
              razorpay_signature: payment.razorpay_signature,
            }),
          });
          const verifyData = (await verify.json()) as OrderLookupResponse;
          console.info('[order-success] Razorpay verification response', {
            status: verify.status,
            orderNumber: verifyData.order?.order_number ?? order.order_number,
            paymentStatus: verifyData.order?.payment_status ?? null,
            error: verifyData.error ?? null,
          });

          if (!verify.ok || !verifyData.order) {
            toast.error(verifyData.error ?? 'Payment verification failed.');
            setRetrying(false);
            return;
          }

          setOrder(verifyData.order);
          toast.success('Payment confirmed');
          setRetrying(false);
        },
        prefill: {
          name: order.customer_name,
          email: '',
          contact: '',
        },
        theme: { color: '#1a1a1a' },
        modal: {
          ondismiss: () => {
            toast('Payment was not completed. You can retry anytime.');
            setRetrying(false);
          },
        },
      });

      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please retry.');
        setRetrying(false);
      });

      rzp.open();
    } catch (retryError) {
      console.error('[order-success] retryPayment failed', retryError);
      toast.error('Could not restart payment.');
      setRetrying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md w-full">
          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="heading-display text-2xl md:text-3xl text-neutral-900 mb-3">We couldn&apos;t load your order</h2>
          <p className="text-sm text-neutral-500 mb-6">{error || 'Order details are unavailable right now.'}</p>
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

  const isPaidRazorpay = order.payment_method === 'razorpay' && order.payment_status === 'paid';
  const isPendingRazorpay = order.payment_method === 'razorpay' && order.payment_status !== 'paid';

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md w-full">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            isPendingRazorpay ? 'bg-amber-100' : 'bg-green-100'
          }`}
        >
          {isPendingRazorpay ? (
            <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
          ) : (
            <Check className="w-10 h-10 text-green-600" />
          )}
        </motion.div>

        <h2 className="heading-display text-2xl md:text-3xl text-neutral-900 mb-3">
          {isPendingRazorpay ? 'Payment Pending' : 'Order Placed!'}
        </h2>

        <div className="bg-white border border-neutral-100 rounded-2xl p-5 text-left shadow-sm mb-6">
          <dl className="space-y-3 text-sm">
            <SummaryRow label="Order Number" value={order.order_number} />
            <SummaryRow label="Customer" value={order.customer_name} />
            <SummaryRow label="Total" value={formatRupees(order.total)} />
            <SummaryRow label="Payment Method" value={order.payment_method.toUpperCase()} />
            <SummaryRow label="Payment Status" value={order.payment_status.toUpperCase()} />
            <SummaryRow label="Order Status" value={order.order_status.toUpperCase()} />
          </dl>
        </div>

        {order.payment_method === 'cod' && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            Pay {formatRupees(order.total)} in cash on delivery.
          </p>
        )}

        {isPendingRazorpay && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            Your order is saved, but payment is still pending. You can retry the Razorpay payment below.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {isPendingRazorpay ? (
            <button onClick={retryPayment} disabled={retrying} className="btn-primary text-sm">
              {retrying ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Restarting Payment
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Retry Payment
                </span>
              )}
            </button>
          ) : (
            <Link href="/account" className="btn-primary text-sm">
              View My Orders
            </Link>
          )}

          <Link href="/shop" className="btn-outline text-sm">
            Continue Shopping
          </Link>
        </div>

        {isPaidRazorpay && (
          <p className="text-xs text-neutral-400">
            Payment confirmed. We&apos;ll keep you updated as your order moves forward.
          </p>
        )}
      </motion.div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-neutral-400">{label}</dt>
      <dd className="font-medium text-neutral-900 text-right">{value}</dd>
    </div>
  );
}
