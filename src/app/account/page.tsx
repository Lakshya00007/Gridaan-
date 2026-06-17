import { Suspense } from 'react';
import AccountView from './_view';
import { buildNoIndexMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata = buildNoIndexMetadata('My Account');

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AccountView />
    </Suspense>
  );
}
