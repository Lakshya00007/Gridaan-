'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import CheckoutView from './_view';
import { useCart } from '@/store/cart';

export default function CheckoutPageClient() {
  const { guest } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  if (guest.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-5xl mb-4">🛒</p>
          <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
          <p className="text-sm text-neutral-500 mb-6">Add some beautiful jewelry first!</p>
          <Link href="/shop" className="btn-primary">
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      <CheckoutView />
    </Suspense>
  );
}
