import type { Metadata } from 'next';
import { Suspense } from 'react';
import UpiRedirectView from './_view';

export const metadata: Metadata = {
  title: 'Processing UPI Payment | Gridaan',
  robots: {
    index: false,
    follow: false,
  },
};

export default function UpiRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center bg-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold-500 border-t-transparent" />
        </div>
      }
    >
      <UpiRedirectView />
    </Suspense>
  );
}
