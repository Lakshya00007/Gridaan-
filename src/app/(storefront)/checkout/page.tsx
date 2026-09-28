import CheckoutPageClient from './_page-client';
import { buildNoIndexMetadata } from '@/lib/seo';
import { getVerifiedCustomer } from '@/lib/auth/customer';
import { redirect } from 'next/navigation';

export const metadata = buildNoIndexMetadata(
  'Checkout',
  'Complete your Gridaan artificial fashion jewellery order.'
);

export default async function CheckoutPage() {
  if (!await getVerifiedCustomer()) redirect('/login?next=%2Fcheckout');
  return <CheckoutPageClient />;
}
