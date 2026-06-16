import { Suspense } from 'react';
import WishlistView from './_view';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Wishlist' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WishlistView />
    </Suspense>
  );
}
