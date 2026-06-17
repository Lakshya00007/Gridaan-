import { Suspense } from 'react';
import ShopView from './_view';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  title: 'Shop Fashion Jewelry Online | Gridaan',
  description:
    "Shop affordable Indian fashion jewelry online at Gridaan. Explore women's earrings, necklaces, bangles, full jewellery sets, and men's chains, bracelets, rings, and pendants.",
  path: '/shop',
});

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
