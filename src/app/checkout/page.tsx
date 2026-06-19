import CheckoutPageClient from './_page-client';
import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata = buildNoIndexMetadata(
  'Checkout',
  'Complete your Gridaan artificial fashion jewellery order.'
);

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
