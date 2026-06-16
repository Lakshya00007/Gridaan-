import { Suspense } from 'react';
import OrderSuccessView from './_view';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <OrderSuccessView />
    </Suspense>
  );
}
