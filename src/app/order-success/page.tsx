import { Suspense } from 'react';
import OrderSuccessView from './_view';
import { buildNoIndexMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata = buildNoIndexMetadata('Order Confirmation');

export default function Page() {
  return (
    <Suspense fallback={null}>
      <OrderSuccessView />
    </Suspense>
  );
}
