import InfoPage from '@/components/InfoPage';
import { JEWELLERY_COMPLIANCE_DISCLAIMER } from '@/lib/business';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Privacy Policy | Gridaan',
  description:
    'Read how Gridaan collects, uses, and protects customer information for orders, payments, delivery, and support.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Privacy"
      title="Privacy Policy"
      description="This page explains the practical ways Gridaan uses customer information to process jewellery orders, support shoppers, and operate the storefront."
      sections={[
        {
          heading: 'Product category note',
          body: [JEWELLERY_COMPLIANCE_DISCLAIMER],
        },
        {
          heading: 'Customer information',
          body: [
            'When you place an order, create an account, or contact support, Gridaan may collect information such as your name, delivery address, mobile number, optional email address, and order details.',
            'We may also store account-related details like saved profile information and wishlist activity when those features are used.',
          ],
        },
        {
          heading: 'Order and payment data',
          body: [
            'Order information is used to confirm purchases, arrange delivery, help with support requests, and maintain basic order history.',
            'For manual UPI or bank-transfer orders, Gridaan may record the order number, payment note, transaction reference when provided, payment status, and verification outcome so the team can verify actual payment before dispatch.',
            'Cash on Delivery orders may be checked for serviceability, delivery feasibility, and basic fraud prevention before dispatch.',
            'If a third-party payment provider is enabled in the future, payment information may be processed by that provider under their own terms. Gridaan does not store full card or banking details through the storefront.',
          ],
        },
        {
          heading: 'Cookies and analytics',
          body: [
            'The website may use cookies or similar technologies for authentication, session handling, cart continuity, security, and general performance measurement.',
            'Basic analytics or operational logs may be used to understand store usage, identify errors, and reduce abuse.',
          ],
        },
        {
          heading: 'Contact and support data',
          body: [
            'Messages sent through support channels may be used to respond to order questions, resolve delivery concerns, and improve customer experience.',
            'Support communication may happen through WhatsApp, phone, email, or other configured customer-support channels.',
            'We keep support information only as needed for service, troubleshooting, and reasonable record-keeping.',
          ],
        },
        {
          heading: 'How information is used',
          body: [
            'Gridaan uses customer information for order fulfilment, delivery coordination, support, payment verification, fraud prevention, website security, analytics, and reasonable legal or accounting recordkeeping.',
            'No website can promise absolute security, but we work to limit unnecessary exposure and use trusted service providers for core functions.',
          ],
        },
      ]}
    />
  );
}
