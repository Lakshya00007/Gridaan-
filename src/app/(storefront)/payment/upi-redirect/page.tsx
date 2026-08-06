import { permanentRedirect } from 'next/navigation';

export default function LegacyPaymentRedirectPage() {
  permanentRedirect('/checkout');
}
