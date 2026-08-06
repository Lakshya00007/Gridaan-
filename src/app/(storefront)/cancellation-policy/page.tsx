import InfoPage from '@/components/InfoPage';
import { getPublishedBusinessInfo } from '@/lib/business-info.server';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Cancellation Policy',
  description:
    'Read Gridaan’s cancellation policy for securely paid artificial fashion jewellery orders.',
  path: '/cancellation-policy',
});

export default function CancellationPolicyPage() {
  const business = getPublishedBusinessInfo();
  const refundTiming = business.operations.refundInitiationEstimate
    ? `For an approved paid-order cancellation, Gridaan aims to initiate the refund ${business.operations.refundInitiationEstimate}. Provider and bank processing times vary.`
    : 'For an approved paid-order cancellation, support will communicate the expected refund-initiation timeline. Provider and bank processing times vary.';

  return (
    <InfoPage
      eyebrow="Policy"
      title="Cancellation Policy"
      description="How cancellation requests are handled before dispatch, after dispatch, and after verified online payment."
      sections={[
        {
          heading: 'Before dispatch',
          body: [
            'Request cancellation as early as possible through the verified Contact page and include the order number and reason.',
            'Gridaan will try to stop an order that has not been packed or handed to a delivery partner, but a request does not guarantee cancellation until support confirms it.',
          ],
        },
        {
          heading: 'After dispatch',
          body: [
            'An order generally cannot be cancelled after dispatch. Any eligible next step is handled under the Return & Refund Policy after delivery.',
            'Shipping and return-shipping treatment follows the published policies and applicable consumer rights.',
          ],
        },
        {
          heading: 'Payment and order status',
          body: [
            'Secure online payments powered by Razorpay.',
            'A failed, cancelled, abandoned, or unverified checkout attempt does not create a placed order or final order number.',
            'A paid order is placed only after the expected payment is securely verified as captured.',
          ],
        },
        {
          heading: 'Approved refund',
          body: [
            'An approved cancellation refund is sent to the original payment method where supported and cannot exceed the captured amount.',
            refundTiming,
          ],
        },
        {
          heading: 'Contact',
          body: [
            business.supportEmail
              ? `Use ${business.supportEmail} or another verified option on the Contact page.`
              : `Use the Contact page or business mobile +91 ${business.businessPhone}.`,
            'Never send a card number, CVV, UPI PIN, OTP, or banking password with a cancellation request.',
          ],
        },
      ]}
      backHref="/contact"
      backLabel="Contact support"
    />
  );
}
