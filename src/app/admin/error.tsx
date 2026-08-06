'use client';

import { useEffect } from 'react';
import { AdminErrorState } from './_components/ui';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[admin-page] Render failure', { digest: error.digest });
  }, [error]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdminErrorState retry={reset} />
    </div>
  );
}
