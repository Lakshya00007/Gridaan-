import InfoPage from '@/components/InfoPage';
import { BUSINESS_CATEGORY, JEWELLERY_COMPLIANCE_DISCLAIMER } from '@/lib/business';
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
      description="These terms outline the basic conditions for using the Gridaan website and placing orders for artificial and imitation fashion jewellery."
      sections={[
        {
          heading: 'Business category and product nature',
          body: [
            BUSINESS_CATEGORY,
            JEWELLERY_COMPLIANCE_DISCLAIMER,
          ],
        },
        {
          heading: 'Products and pricing',
          body: [
            'Product listings, pricing, offers, and availability may change without prior notice.',
            'Product photos are intended to represent the design as accurately as possible, but slight variations in color, finish, size perception, or detailing may appear because of lighting, screens, and handcrafted variation.',
            'Words such as gold-tone, silver-tone, kundan-look, pearl-look, stone-look, oxidised-look, or premium-look describe fashion styling and finish only. They do not mean real precious metals, diamonds, certified gemstones, bullion, or investment products.',
          ],
        },
        {
          heading: 'Orders and cancellations',
          body: [
            'Orders are subject to stock availability, payment confirmation where applicable, and basic order verification checks.',
            'If a product becomes unavailable, appears incorrectly priced, or cannot be fulfilled for a valid reason, Gridaan may cancel the order and inform the customer.',
            'Cancellation handling is explained in the Cancellation Policy, and return or refund eligibility is explained in the Return & Refund Policy.',
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
          heading: 'Manual UPI, bank transfer, and Cash on Delivery',
          body: [
            'Manual UPI and bank-transfer orders are not automatically treated as paid. Payment pending does not mean payment confirmed.',
            'Gridaan verifies manual payments against actual bank or UPI credit before dispatch. Customers should use the correct order number in the payment note where possible.',
            'Cash on Delivery may be available only on eligible orders and serviceable locations and may be refused for suspected abuse, repeated failed deliveries, or incorrect contact details.',
          ],
        },
        {
          heading: 'Shipping and delivery',
          body: [
            'Shipping timelines, tracking, charges, and COD serviceability are explained in the Shipping & Delivery Policy.',
            'Customers are responsible for being reachable at the provided phone number and for accepting delivery within the courier partner’s delivery attempts.',
          ],
        },
        {
          heading: 'Liability and use of the website',
          body: [
            'Gridaan aims to keep product, pricing, and checkout information accurate, but the website is provided on a reasonable-effort basis and may occasionally contain temporary errors or interruptions.',
            'To the extent reasonably permitted, Gridaan is not responsible for indirect losses arising from delay, courier disruption, payment-verification delay, third-party service interruption, or customer-provided information errors.',
            'Gridaan may cancel, hold, or refuse orders where fraud, abuse, suspicious payment activity, unavailable stock, incorrect pricing, or delivery risk is identified.',
          ],
        },
      ]}
    />
  );
}
