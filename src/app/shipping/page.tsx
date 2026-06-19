import InfoPage from '@/components/InfoPage';
import { JEWELLERY_COMPLIANCE_DISCLAIMER } from '@/lib/business';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Shipping & Delivery | Gridaan',
  description:
    'Read Gridaan’s shipping and delivery policy for affordable artificial and imitation fashion jewellery orders.',
  path: '/shipping',
});

export default function ShippingPage() {
  return (
    <InfoPage
      eyebrow="Shipping"
      title="Shipping & Delivery"
      description="A simple overview of how Gridaan handles processing timelines, shipping charges, delivery estimates, tracking, and Cash on Delivery availability."
      sections={[
        {
          heading: 'Product category note',
          body: [JEWELLERY_COMPLIANCE_DISCLAIMER],
        },
        {
          heading: 'Shipping across India',
          body: [
            'Gridaan ships artificial and imitation fashion jewellery orders across India using delivery partners selected for reach and reliability.',
            'Serviceability can vary by PIN code, so final delivery options are confirmed during checkout.',
          ],
        },
        {
          heading: 'Processing and delivery timeline',
          body: [
            'Orders are usually processed within 1–2 business days after order placement or payment verification, where applicable.',
            'Standard delivery is generally estimated at 3–7 business days after dispatch depending on the destination, courier reach, PIN code serviceability, holidays, and operational conditions.',
            'Occasional delays may happen due to courier capacity, remote locations, weather, public holidays, or incorrect customer contact/address details.',
          ],
        },
        {
          heading: 'Cash on Delivery and charges',
          body: [
            'Cash on Delivery may be available on eligible orders and serviceable locations within India.',
            'Shipping charges, free-shipping eligibility, and any COD-related terms are shown during checkout before the order is placed.',
            'COD availability depends on courier serviceability and may not be available for every PIN code or order value.',
          ],
        },
        {
          heading: 'Tracking and delivery updates',
          body: [
            'Once an order is dispatched, tracking details are shared through the order flow or support channels when courier tracking is available.',
            'If you need an update, contact support with your order number so the team can help check delivery progress.',
          ],
        },
      ]}
    />
  );
}
