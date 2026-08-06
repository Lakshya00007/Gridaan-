import InfoPage from '@/components/InfoPage';
import { publicBusinessConfig } from '@/lib/business';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Cancellation Policy | Gridaan',
  description:
    'Read Gridaan’s cancellation policy for online-paid artificial fashion jewellery orders.',
  path: '/cancellation-policy',
});

export default function CancellationPolicyPage() {
  return (
    <InfoPage
      eyebrow="Policy"
      title="Cancellation Policy"
      description="How order cancellation requests are handled before dispatch, after dispatch, and after successful online payment."
      sections={[
        {
          heading: 'Cancellation before dispatch',
          body: [
            'Customers may request cancellation before the order is dispatched by contacting support with the order number.',
            'If the order has not been packed, handed to the courier, or otherwise processed for dispatch, Gridaan will try to cancel it and update the customer.',
          ],
        },
        {
          heading: 'Cancellation after dispatch',
          body: [
            'Once an order has been dispatched, cancellation may not be possible through support. The customer may need to follow the delivery or return process depending on the situation.',
            'Shipping charges or courier costs may be considered where applicable and where permitted by the policy shown at checkout or on the website.',
          ],
        },
        {
          heading: 'Online payment confirmation',
          body: [
            'Cash on Delivery, manual UPI, bank transfer, screenshot verification, and UTR submission are not available.',
            'If Razorpay payment fails, is cancelled, or cannot be verified as captured, no final order number is generated and the order is not placed.',
          ],
        },
        {
          heading: 'Paid-order cancellation',
          body: [
            'Orders are confirmed for dispatch only after Razorpay verifies successful captured payment.',
            'If a customer requests cancellation before dispatch and the paid order is approved for cancellation, any approved refund is processed through the payment/refund flow supported by Gridaan and Razorpay.',
          ],
        },
        {
          heading: 'Refund timeline',
          body: [
            'Approved cancellation refunds are usually initiated within 5–7 business days after cancellation approval and verification of payment/customer details.',
            'Banking, UPI, or internal processing delays may occasionally extend the time taken for the amount to reflect in the customer account.',
          ],
        },
        {
          heading: 'How to request cancellation',
          body: [
            'Contact support as early as possible with your order number and cancellation reason.',
            publicBusinessConfig.supportEmail
              ? `Email support: ${publicBusinessConfig.supportEmail}.`
              : 'Use the Contact page for the currently configured support channel.',
            publicBusinessConfig.supportPhone
              ? `Support phone/WhatsApp: ${publicBusinessConfig.supportPhone}.`
              : 'Please include your order number for faster assistance.',
          ],
        },
      ]}
      backHref="/contact"
      backLabel="Contact support"
    />
  );
}
