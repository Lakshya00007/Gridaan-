import { Suspense } from 'react';
import LoginView from './_view';

export const metadata = { title: 'Sign in', robots: { index: false } };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginView />
    </Suspense>
  );
}
