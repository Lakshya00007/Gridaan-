'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Loader2, ChevronRight } from 'lucide-react';
import { formatRupees, formatDate } from '@/lib/utils';
import type { Order } from '@/types';

const statusColors: Record<string, string> = {
  placed: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  returned: 'bg-neutral-200 text-neutral-700',
};

export default function AccountView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/orders/mine')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? 'Failed to load orders');
          return;
        }
        setOrders(data.orders ?? []);
      })
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container py-12 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-12 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/login" className="btn-primary">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12">
      <h1 className="heading-display text-2xl md:text-3xl text-neutral-900 mb-8">My Orders</h1>
      {orders.length === 0 ? (
        <div className="bg-warm-50 rounded-2xl p-12 text-center">
          <Package className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">No orders yet</p>
          <Link href="/shop" className="btn-primary mt-4 inline-flex">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/order-success?order=${encodeURIComponent(order.order_number)}`}
              className="block bg-white rounded-2xl p-5 shadow-sm border border-neutral-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold">{order.order_number}</p>
                  <p className="text-xs text-neutral-400">{formatDate(order.created_at)}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[order.order_status]}`}>
                  {order.order_status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">
                  {order.items?.length ?? 0} item(s) · {order.payment_method.toUpperCase()}
                </span>
                <span className="font-bold">{formatRupees(order.total)}</span>
              </div>
              <div className="mt-2 flex items-center text-xs text-gold-700">
                View details <ChevronRight className="w-3 h-3" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
