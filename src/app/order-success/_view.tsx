'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatRupees } from '@/lib/utils';
import { buildCustomerOrderLink } from '@/lib/whatsapp';
import type { Order } from '@/types';

export default function OrderSuccessView() {
  const sp = useSearchParams();
  const router = useRouter();
  const id = sp.get('id');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      router.replace('/');
      return;
    }
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setOrder(data.order ?? null);
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md w-full">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
        >
          <Check className="w-10 h-10 text-green-600" />
        </motion.div>
        <h2 className="heading-display text-2xl md:text-3xl text-neutral-900 mb-3">Order Placed! 🎉</h2>
        {order ? (
          <>
            <p className="text-neutral-500 mb-2">
              Order ID: <span className="font-semibold text-neutral-700">{order.order_number}</span>
            </p>
            <p className="text-sm text-neutral-400 mb-2">Total: {formatRupees(order.total)}</p>
            <p className="text-sm text-neutral-400 mb-8">
              Payment: {order.payment_method.toUpperCase()} — {order.payment_status}
            </p>
            {order.payment_method === 'cod' && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                Pay {formatRupees(order.total)} in cash on delivery.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {order.payment_method === 'razorpay' && order.payment_status === 'paid' && (
                <a
                  href={buildCustomerOrderLink(order)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline text-sm"
                >
                  📱 Share on WhatsApp
                </a>
              )}
              <Link href="/account" className="btn-primary text-sm">
                View My Orders
              </Link>
            </div>
          </>
        ) : (
          <p className="text-sm text-neutral-400 mb-6">Order not found.</p>
        )}
        <Link href="/shop" className="text-sm text-neutral-500 hover:text-neutral-900">
          Continue Shopping
        </Link>
      </motion.div>
    </div>
  );
}
