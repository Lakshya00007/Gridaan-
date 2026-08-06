import Link from 'next/link';
import { ShieldX } from 'lucide-react';

export const metadata = { title: 'Access denied · Admin' };

export default function AdminForbiddenPage() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg rounded-xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <ShieldX className="mx-auto h-8 w-8 text-red-600" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold text-neutral-950">Permission required</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Your admin role does not allow access to this module.
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white hover:bg-neutral-800 focus-visible:ring-4 focus-visible:ring-gold-200"
        >
          Return to dashboard
        </Link>
      </div>
    </div>
  );
}
