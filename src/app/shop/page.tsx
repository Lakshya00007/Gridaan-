import { Suspense } from 'react';
import ShopView from './_view';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Shop',
  description: 'Browse our complete collection of premium fashion jewelry.',
};

export default function ShopPage() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <ShopView />
    </Suspense>
  );
}

function ShopSkeleton() {
  return (
    <div className="container py-12">
      <div className="h-8 w-40 bg-neutral-100 rounded mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-square bg-neutral-100 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
