import InfoPage from '@/components/InfoPage';
import { publicBusinessConfig } from '@/lib/business';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Cancellation Policy | Gridaan',
  description:
    'Read Gridaan’s cancellation policy for COD, manual UPI, and bank-transfer artificial fashion jewellery orders.',
  path: '/cancellation-policy',
});

export default function CancellationPolicyPage() {
  return (
    <InfoPage
      eyebrow="Policy"
      title="Cancellation Policy"
      description="How order cancellation requests are handled before dispatch, after dispatch, and for manual payment or COD orders."
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
            'Shipping charges, COD fees, or courier costs may be considered where applicable and where permitted by the policy shown at checkout or on the website.',
          ],
        },
        {
          heading: 'COD refusal policy',
          body: [
            'Cash on Delivery orders should be accepted when the courier attempts delivery. Repeated COD refusals, unreachable phone numbers, or suspicious ordering behaviour may lead to future COD restrictions or order cancellation.',
            'Incorrect address or phone details may lead to cancellation if the courier cannot complete delivery.',
          ],
        },
        {
          heading: 'Manual UPI or bank-transfer cancellation',
          body: [
            'For manual UPI or bank-transfer orders, payment pending does not mean payment confirmed. Orders are confirmed for dispatch only after Gridaan verifies actual payment credit.',
            'If a customer requests cancellation before dispatch and payment has already been verified, any approved refund will be processed to verified UPI or bank details.',
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
