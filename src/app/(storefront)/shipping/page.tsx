import InfoPage from '@/components/InfoPage';
import { getPublishedBusinessInfo } from '@/lib/business-info.server';
import { JEWELLERY_COMPLIANCE_DISCLAIMER } from '@/lib/business-info';
import { buildPageMetadata } from '@/lib/seo';
import { formatRupees } from '@/lib/utils';

export const metadata = buildPageMetadata({
  title: 'Shipping & Delivery',
  description:
    'Read Gridaan’s shipping charges, service region, dispatch information, and delivery guidance.',
  path: '/shipping',
});

export default function ShippingPage() {
  const business = getPublishedBusinessInfo();
  const deliveryDetails = [
    business.operations.dispatchEstimate
      ? `Configured dispatch estimate: ${business.operations.dispatchEstimate}.`
      : 'The dispatch estimate is shown when Gridaan has a verified operational timeline. Contact support with an order number for the current dispatch status.',
    business.operations.deliveryEstimate
      ? `Configured normal-area delivery estimate: ${business.operations.deliveryEstimate}.`
      : 'Delivery timing depends on destination serviceability and the assigned carrier; no fixed delivery window is promised where an estimate is not configured.',
    ...(business.operations.remoteAreaEstimate
      ? [`Configured remote-area estimate: ${business.operations.remoteAreaEstimate}.`]
      : []),
  ];

  return (
    <InfoPage
      eyebrow="Shipping"
      title="Shipping & Delivery"
      description="Current service region, shipping charges, delivery information, tracking, and secure-payment requirements."
      sections={[
        {
          heading: 'Product category note',
          body: [JEWELLERY_COMPLIANCE_DISCLAIMER],
        },
        {
          heading: `Shipping within ${business.shipping.supportedRegion}`,
          body: [
            `Gridaan currently accepts delivery addresses within ${business.shipping.supportedRegion}. Serviceability depends on the delivery PIN code and carrier coverage.`,
            `Standard shipping is ${formatRupees(business.shipping.feeRupees)}. Shipping is free when the eligible cart subtotal is at least ${formatRupees(business.shipping.freeShippingThresholdRupees)}. The checkout total is the final source for the charge applied to an order.`,
          ],
        },
        {
          heading: 'Dispatch and delivery estimates',
          body: deliveryDetails,
        },
        {
          heading: 'Payment confirmation',
          body: [
            'Secure online payments powered by Razorpay.',
            'An order is placed only after the payment is securely verified as captured. A failed, cancelled, abandoned, or unverified checkout attempt does not create a placed order.',
          ],
        },
        {
          heading: 'Tracking and delivery issues',
          body: [
            'Tracking details are shared when the assigned carrier makes them available.',
            'Contact support with your order number for a status check. Report an incorrect, damaged, or missing item within 48 hours of delivery under the Return & Refund Policy.',
          ],
        },
      ]}
    />
  );
}
