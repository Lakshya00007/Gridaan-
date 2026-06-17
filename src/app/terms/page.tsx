import InfoPage from '@/components/InfoPage';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Terms of Service | Gridaan',
  description:
    'Read Gridaan’s terms of service for using the website, placing orders, payments, shipping, returns, and customer responsibilities.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <InfoPage
      eyebrow="Terms"
      title="Terms of Service"
      description="These terms outline the basic conditions for using the Gridaan website and placing orders for fashion jewelry."
      sections={[
        {
          heading: 'Products and pricing',
          body: [
            'Product listings, pricing, offers, and availability may change without prior notice.',
            'Product photos are intended to represent the design as accurately as possible, but slight variations in color, finish, size perception, or detailing may appear because of lighting, screens, and handcrafted variation.',
          ],
        },
        {
          heading: 'Orders and cancellations',
          body: [
            'Orders are subject to stock availability, payment confirmation where applicable, and basic order verification checks.',
            'If a product becomes unavailable, appears incorrectly priced, or cannot be fulfilled for a valid reason, Gridaan may cancel the order and inform the customer.',
          ],
        },
        {
          heading: 'Customer responsibilities',
          body: [
            'Customers are responsible for providing accurate shipping details, contact information, and any delivery instructions needed to complete an order successfully.',
            'Incorrect address or contact details may lead to delays, failed delivery attempts, or cancellation outcomes that are outside our control.',
          ],
        },
        {
          heading: 'Payment and Cash on Delivery',
          body: [
            'Online payments are processed through the payment methods shown at checkout, while Cash on Delivery may be available only on eligible orders and locations.',
            'Uncompleted online payments do not guarantee order confirmation until payment verification is successful.',
          ],
        },
        {
          heading: 'Liability and use of the website',
          body: [
            'Gridaan aims to keep product, pricing, and checkout information accurate, but the website is provided on a reasonable-effort basis and may occasionally contain temporary errors or interruptions.',
            'To the extent reasonably permitted, Gridaan is not responsible for indirect losses arising from delay, courier disruption, third-party payment interruption, or customer-provided information errors.',
          ],
        },
      ]}
    />
  );
}
