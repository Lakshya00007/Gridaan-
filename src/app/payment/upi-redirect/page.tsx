import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Manual UPI Disabled | Gridaan',
  robots: {
    index: false,
    follow: false,
  },
};

export default function UpiRedirectPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-700">Online payment only</p>
        <h1 className="heading-display mt-3 text-2xl text-neutral-950">Manual UPI is unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-500">
          Gridaan places orders only after a successful Razorpay payment. Please return to checkout and use Online Payment for UPI, cards, net banking, or wallets.
        </p>
        <Link href="/checkout" className="btn-primary mt-6 text-sm">
          Back to Checkout
        </Link>
      </div>
    </main>
  );
}
