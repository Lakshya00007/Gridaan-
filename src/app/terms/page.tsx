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
            'Orders are subject to stock availability, successful Razorpay payment capture, and basic order verification checks.',
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
          heading: 'Online payment only',
          body: [
            'Gridaan accepts online payments through Razorpay. Supported methods can include UPI, cards, net banking, and wallets where Razorpay enables them.',
            'Cash on Delivery, manual UPI, bank transfer, screenshot verification, and UTR submission are not available.',
            'A checkout attempt is not a placed order. An order is placed only after the server verifies the Razorpay payment and confirms captured payment for the expected amount and currency.',
          ],
        },
        {
          heading: 'Shipping and delivery',
          body: [
            'Shipping timelines, tracking, charges, and online payment confirmation are explained in the Shipping & Delivery Policy.',
            'Customers are responsible for being reachable at the provided phone number and for accepting delivery within the courier partner’s delivery attempts.',
          ],
        },
        {
          heading: 'Liability and use of the website',
          body: [
            'Gridaan aims to keep product, pricing, and checkout information accurate, but the website is provided on a reasonable-effort basis and may occasionally contain temporary errors or interruptions.',
            'To the extent reasonably permitted, Gridaan is not responsible for indirect losses arising from delay, courier disruption, Razorpay/payment-provider delay, third-party service interruption, or customer-provided information errors.',
            'Gridaan may cancel, hold, or refuse orders where fraud, abuse, suspicious payment activity, unavailable stock, incorrect pricing, or delivery risk is identified.',
          ],
        },
      ]}
    />
  );
}
