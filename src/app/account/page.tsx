import { Suspense } from 'react';
import AccountView from './_view';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My Account' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AccountView />
    </Suspense>
  );
}
