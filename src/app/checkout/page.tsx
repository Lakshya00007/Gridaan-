import CheckoutPageClient from './_page-client';
import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata = buildNoIndexMetadata(
  'Checkout',
  'Complete your Gridaan jewelry order securely.'
);

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
