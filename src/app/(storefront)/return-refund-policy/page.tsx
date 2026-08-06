import InfoPage from '@/components/InfoPage';
import { getPublishedBusinessInfo } from '@/lib/business-info.server';
import { JEWELLERY_COMPLIANCE_DISCLAIMER } from '@/lib/business-info';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Return & Refund Policy',
  description:
    'Read Gridaan’s return and refund policy for artificial, imitation, and fashion jewellery orders.',
  path: '/return-refund-policy',
});

export default function ReturnRefundPolicyPage() {
  const business = getPublishedBusinessInfo();
  const refundTiming = business.operations.refundInitiationEstimate
    ? `After approval and inspection, Gridaan aims to initiate the refund ${business.operations.refundInitiationEstimate}. Payment-provider and bank processing times vary and are outside Gridaan’s direct control.`
    : 'After approval and inspection, support will communicate the expected refund-initiation timeline. Payment-provider and bank processing times vary and are outside Gridaan’s direct control.';

  return (
    <InfoPage
      eyebrow="Policy"
      title="Return & Refund Policy"
      description="Eligibility, request windows, inspection, return shipping, and refund handling for Gridaan orders."
      sections={[
        {
          heading: 'Product category',
          body: [JEWELLERY_COMPLIANCE_DISCLAIMER],
        },
        {
          heading: 'Eligible unused products',
          body: [
            'For a product marked return-eligible, submit the return request within 7 calendar days of delivery.',
            'The product must be unused, unworn, unaltered, and returned with its original packaging, tags, and all included pieces. Return eligibility shown on the product page also applies.',
          ],
        },
        {
          heading: 'Damaged, incorrect, or missing items',
          body: [
            'Report a damaged, incorrect, or missing item within 48 hours of delivery. Include the order number and clear photographs of the product and packaging so the claim can be reviewed.',
            'Support may request additional evidence reasonably needed to verify the issue. Your statutory consumer rights are not limited by this evidence request.',
          ],
        },
        {
          heading: 'Exclusions',
          body: [
            'A return may be declined when a product has been used, worn, altered, damaged after delivery, or returned without essential packaging or included pieces.',
            'A product specifically marked non-returnable cannot be returned for change of mind. This does not exclude remedies required by applicable law for a defective, damaged, incorrect, or materially misdescribed item.',
          ],
        },
        {
          heading: 'Inspection and outcome',
          body: [
            'A requested return is not automatically approved. Returned products are inspected before a refund or other remedy is confirmed.',
            'If approved, the available outcome may be a replacement, exchange, or refund depending on the verified issue and product availability.',
          ],
        },
        {
          heading: 'Shipping charges',
          body: [
            'For an approved damaged, incorrect, or missing-item claim, Gridaan will arrange or reimburse reasonable return shipping as communicated by support.',
            'For an approved change-of-mind return, the customer is responsible for the return shipping cost. The original shipping charge is not refunded unless required by law or the return results from a verified Gridaan fulfilment error.',
          ],
        },
        {
          heading: 'Refund method and timing',
          body: [
            'Approved refunds are sent to the original payment method where the payment provider supports it. A refund cannot exceed the captured payment amount.',
            refundTiming,
          ],
        },
        {
          heading: 'How to request a return',
          body: [
            'Use the Contact page and include your order number, reason, and the evidence requested above. Do not send card details, CVV, UPI PIN, OTP, or banking passwords.',
            business.supportEmail
              ? `Configured support email: ${business.supportEmail}.`
              : `Business contact: +91 ${business.businessPhone}.`,
          ],
        },
      ]}
      backHref="/contact"
      backLabel="Contact support"
    />
  );
}
