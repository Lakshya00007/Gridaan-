import InfoPage from '@/components/InfoPage';
import { JEWELLERY_COMPLIANCE_DISCLAIMER, publicBusinessConfig } from '@/lib/business';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Return & Refund Policy | Gridaan',
  description:
    'Read Gridaan’s return and refund policy for artificial, imitation, and fashion jewellery orders, including damaged or wrong product support.',
  path: '/return-refund-policy',
});

export default function ReturnRefundPolicyPage() {
  return (
    <InfoPage
      eyebrow="Policy"
      title="Return & Refund Policy"
      description="Clear return, exchange, and refund guidance for Gridaan artificial and imitation fashion jewellery orders."
      sections={[
        {
          heading: 'Product category',
          body: [
            JEWELLERY_COMPLIANCE_DISCLAIMER,
            'Because fashion jewellery is a personal-wear accessory category, returns are reviewed carefully for hygiene, usage, damage, and packaging condition.',
          ],
        },
        {
          heading: 'Return eligibility',
          body: [
            'Return or exchange requests may be accepted when the customer receives a damaged item, a wrong item, or a materially incorrect product compared with the order.',
            'The item should be unused, unworn, and returned with original packaging, tags, invoice or order details, and all included accessories where applicable.',
          ],
        },
        {
          heading: 'Return window',
          body: [
            'Customers should contact support within 48 hours of delivery for damaged, wrong, or missing-item concerns.',
            'Requests raised after the review window may be declined if the issue cannot be reasonably verified.',
          ],
        },
        {
          heading: 'Damaged or wrong product process',
          body: [
            'Please share your order number, clear photos of the product and packaging, and an unboxing video where available. This helps the team verify transit damage, wrong product claims, or missing items quickly.',
            'Gridaan may request additional details before approving a replacement, return pickup, store credit, or refund.',
          ],
        },
        {
          heading: 'Non-returnable cases',
          body: [
            'Returns may be declined for used, worn, altered, damaged-after-delivery, missing-packaging, or hygiene-sensitive items.',
            'Minor color, shine, size perception, or finish differences caused by screen settings, lighting, photography, or handmade-style variation are not always treated as return defects.',
          ],
        },
        {
          heading: 'Refund timeline and method',
          body: [
            'Approved refunds are usually initiated within 5–7 business days after the returned item is received and checked, or after the issue is verified by support where return pickup is not required.',
            'For manual UPI or bank-transfer payments, refunds may be processed back through UPI/bank transfer to verified customer details. COD refunds may require verified bank or UPI details from the customer.',
          ],
        },
        {
          heading: 'Support contact',
          body: [
            publicBusinessConfig.supportEmail
              ? `Email support: ${publicBusinessConfig.supportEmail}.`
              : 'Use the Contact page for the currently configured support channel.',
            publicBusinessConfig.supportPhone
              ? `Support phone/WhatsApp: ${publicBusinessConfig.supportPhone}.`
              : 'For faster review, include your order number in every message.',
          ],
        },
      ]}
      backHref="/contact"
      backLabel="Contact support"
    />
  );
}
