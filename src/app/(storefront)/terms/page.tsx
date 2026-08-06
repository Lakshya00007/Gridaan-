import InfoPage from '@/components/InfoPage';
import { getPublishedBusinessInfo } from '@/lib/business-info.server';
import { BUSINESS_CATEGORY, JEWELLERY_COMPLIANCE_DISCLAIMER } from '@/lib/business-info';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Terms of Service',
  description:
    'Read Gridaan’s terms for website use, product information, orders, secure payment, shipping, cancellations, and returns.',
  path: '/terms',
});

export default function TermsPage() {
  const business = getPublishedBusinessInfo();

  return (
    <InfoPage
      eyebrow="Terms"
      title="Terms of Service"
      description="Conditions for using the Gridaan storefront and ordering artificial and imitation fashion jewellery."
      sections={[
        {
          heading: 'Business identity and product category',
          body: [
            `${business.legalName}, Udyam Registration Number ${business.udyamRegistrationNumber}.`,
            `Business category: ${BUSINESS_CATEGORY}.`,
            JEWELLERY_COMPLIANCE_DISCLAIMER,
          ],
        },
        {
          heading: 'Products and pricing',
          body: [
            'Product listings, prices, offers, and availability may change before an order is placed.',
            'Photographs aim to represent each design accurately, but lighting and screen settings can affect colour and finish appearance. Product-specific details shown on the product page form part of the listing.',
            'Terms such as gold-tone, silver-tone, kundan-look, pearl-look, stone-look, oxidised-look, or premium-look describe fashion styling or finish only.',
          ],
        },
        {
          heading: 'Orders',
          body: [
            'The server validates products, current prices, quantities, stock, discounts, and shipping before payment is initialized.',
            'A checkout attempt is not a placed order. An order is placed only after the expected Razorpay payment is securely verified as captured.',
            'Gridaan may cancel or decline fulfilment for unavailable stock, an incorrect listing price, suspected fraud or abuse, an invalid delivery address, or another legitimate operational reason. Any captured amount subject to an approved cancellation follows the refund process.',
          ],
        },
        {
          heading: 'Secure payment',
          body: [
            'Secure online payments powered by Razorpay.',
            'Pay securely using UPI, cards, net banking and other payment methods supported by Razorpay.',
            'Never send Gridaan your card number, CVV, UPI PIN, OTP, or banking password. Frontend success alone does not confirm an order.',
          ],
        },
        {
          heading: 'Customer responsibilities',
          body: [
            'Provide accurate recipient, mobile, address, PIN code, and delivery information and remain reachable for delivery.',
            'Review the final amount before authorising payment and use the Contact page promptly if an order detail needs correction.',
          ],
        },
        {
          heading: 'Shipping, cancellation, and returns',
          body: [
            'The Shipping page states the configured region, charges, and any verified operational estimates.',
            'Cancellation requests are governed by the Cancellation Policy. Return eligibility, request windows, inspection, shipping treatment, and refund handling are governed by the Return & Refund Policy.',
          ],
        },
        {
          heading: 'Website availability and applicable rights',
          body: [
            'The website can occasionally be interrupted by maintenance or third-party service availability. Gridaan will take reasonable steps to keep customer-facing information accurate and services available.',
            'Nothing in these terms limits consumer rights that cannot lawfully be excluded. The registered/correspondence address and verified support channels are listed on the Contact page.',
          ],
        },
      ]}
    />
  );
}
