'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Check, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatRupees } from '@/lib/utils';
import type { OrderSuccessSummary } from '@/types';
import { buildBusinessPhoneHref, businessInfo } from '@/lib/business-info';

type OrderLookupResponse = {
  order?: OrderSuccessSummary;
  error?: string;
};

export default function OrderSuccessView() {
  const sp = useSearchParams();
  const router = useRouter();
  const lookupParam = sp.get('order') ?? sp.get('orderId') ?? sp.get('id');
  const [order, setOrder] = useState<OrderSuccessSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!lookupParam) {
      router.replace('/');
      return;
    }

    fetch(`/api/orders/${encodeURIComponent(lookupParam)}`)
      .then(async (response) => {
        const data = (await response.json()) as OrderLookupResponse;
        if (!response.ok || !data.order) {
          setError(data.error ?? 'Order not found.');
          setOrder(null);
          return;
        }
        if (data.order.payment_status !== 'captured' || data.order.order_status !== 'placed') {
          setError('This order has not been placed because payment is not captured yet.');
          setOrder(null);
          return;
        }
        setOrder(data.order);
        setError('');
      })
      .catch(() => {
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
            Payment verification is pending
          </h2>
          <p className="mb-6 text-sm leading-6 text-neutral-500">
            {error || 'Your order will appear only after Razorpay confirms captured payment.'}
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/checkout" className="btn-primary text-sm">
              Return to Checkout
            </Link>
            <Link href="/contact" className="btn-outline text-sm">
              Contact Support
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

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
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100"
        >
          <Check className="h-10 w-10 text-green-600" />
        </motion.div>

        <h1 className="heading-display mb-3 text-2xl text-neutral-950 md:text-3xl">
          Payment successful — order placed
        </h1>
        <p className="mx-auto mb-6 max-w-md text-sm leading-6 text-neutral-600">
          Payment received. Your Gridaan order is being prepared for shipment.
        </p>

        <div className="mb-6 rounded-2xl border border-neutral-100 bg-white p-5 text-left shadow-sm">
          <dl className="space-y-3 text-sm">
            <SummaryRow label="Order Number" value={order.order_number} />
            <SummaryRow label="Customer" value={order.customer_name} />
            <SummaryRow label="Amount" value={formatRupees(order.total)} />
            <SummaryRow label="Payment Method" value="Online Payment" />
            <SummaryRow label="Payment Status" value="CAPTURED" />
            <SummaryRow label="Order Status" value="PLACED" />
          </dl>
        </div>

        <div className="mb-5 flex items-center justify-center gap-2 rounded-xl border border-gold-200 bg-gold-50 p-3 text-xs font-medium text-gold-900">
          <CreditCard className="h-4 w-4" />
          Paid online through Razorpay
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href="/account" className="btn-primary text-sm">
            View My Orders
          </Link>
          <Link href="/shop" className="btn-outline text-sm">
            Continue Shopping
          </Link>
        </div>
        <p className="mt-5 text-xs leading-5 text-neutral-500">
          Need order help? Contact {businessInfo.legalName} at{' '}
          <a href={buildBusinessPhoneHref()} className="font-medium text-gold-700 hover:text-gold-800">
            +91 {businessInfo.businessPhone}
          </a>{' '}
          and quote your order number.
        </p>
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
