import InfoPage from '@/components/InfoPage';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Shipping & Delivery | Gridaan',
  description:
    'Read Gridaan’s shipping and delivery policy for affordable Indian fashion jewelry orders.',
  path: '/shipping',
});

export default function ShippingPage() {
  return (
    <InfoPage
      eyebrow="Shipping"
      title="Shipping & Delivery"
      description="A simple overview of how Gridaan handles shipping, delivery timelines, order tracking, and Cash on Delivery availability."
      sections={[
        {
          heading: 'Shipping across India',
          body: [
            'Gridaan ships fashion jewelry orders across India using delivery partners selected for reach and reliability.',
            'Serviceability can vary by PIN code, so final delivery options are confirmed during checkout.',
          ],
        },
        {
          heading: 'Delivery timeline',
          body: [
            'Orders are usually processed before dispatch, and standard delivery timelines can vary depending on destination, courier availability, holidays, and sale periods.',
            'Most orders are expected to arrive within a standard delivery window after dispatch, but occasional delays can happen beyond our control.',
          ],
        },
        {
          heading: 'Cash on Delivery and charges',
          body: [
            'Cash on Delivery may be available on eligible orders and serviceable locations within India.',
            'Shipping charges, free-shipping eligibility, and any COD-related terms are shown during the shopping and checkout process.',
          ],
        },
        {
          heading: 'Tracking and delivery updates',
          body: [
            'Once an order is dispatched, tracking details may be shared through the order flow or support channels when available.',
            'If you need an update, contact support with your order number so the team can help check delivery progress.',
          ],
        },
      ]}
    />
  );
}
