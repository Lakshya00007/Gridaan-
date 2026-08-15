import InfoPage from '@/components/InfoPage';
import { JEWELLERY_COMPLIANCE_DISCLAIMER } from '@/lib/business-info';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Privacy Policy',
  description:
    'Read how Gridaan uses customer information for orders, secure payment, delivery, account features, and support.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Privacy"
      title="Privacy Policy"
      description="How Gridaan handles information needed to operate the storefront, fulfil paid orders, and support customers."
      sections={[
        {
          heading: 'Product category note',
          body: [JEWELLERY_COMPLIANCE_DISCLAIMER],
        },
        {
          heading: 'Information collected',
          body: [
            'When you create an account, place an order, or contact support, Gridaan may collect your name, mobile number, email when supplied, delivery address, account identifiers, cart details, and order history.',
            'Technical records such as session, security, request, device, and basic analytics information may be processed to keep the storefront working, prevent abuse, and diagnose errors.',
          ],
        },
        {
          heading: 'Orders and secure payment',
          body: [
            'Secure online payments powered by Razorpay. Razorpay processes the payment interaction and may handle payment information under its own privacy terms.',
            'Gridaan stores only the payment and reconciliation metadata needed for order placement, fulfilment, support, fraud checks, webhook idempotency, and refunds, such as payment identifiers, amount, currency, status, method category, and safe failure information.',
            'Gridaan does not ask customers to provide card numbers, CVV, UPI PINs, OTPs, or banking passwords to the storefront or support team.',
          ],
        },
        {
          heading: 'How information is used',
          body: [
            'Information is used to validate and fulfil orders, reserve and commit stock, arrange delivery, provide support, maintain account features, reconcile payments, handle approved returns or refunds, prevent fraud, secure the service, and meet applicable record-keeping obligations.',
            'Gridaan does not sell sensitive payment credentials because it does not collect them.',
          ],
        },
        {
          heading: 'Service providers and retention',
          body: [
            'Necessary information may be shared with providers that support hosting, database, authentication, payments, messaging, analytics, and delivery, limited to their operational purpose.',
            'For delivery, tracking, delivery communication, and shipment issue resolution, Gridaan may share fulfilment-required customer and order information with logistics or shipping partners.',
            'Records are retained only as reasonably needed for account operation, fulfilment, support, security, disputes, refunds, and applicable legal or accounting obligations.',
          ],
        },
        {
          heading: 'Marketing analytics choices',
          body: [
            'Marketing and advertising measurement is optional. If you accept marketing analytics, Gridaan may use Meta Pixel in the browser to measure ecommerce actions such as page views, product views, add-to-cart actions, checkout starts, and purchases.',
            'When configured on the server and when your order consent snapshot allows it, Gridaan may also send a server-side purchase conversion to Meta through Conversions API using order details such as product identifiers, quantities, INR value, order identifier, and hashed contact matching information such as email or phone.',
            'If you reject marketing analytics, Meta Pixel is not intentionally loaded for your browser and server-side Meta purchase measurement is not sent from that order consent snapshot.',
            'You can accept, reject, or change marketing analytics at any time from the Privacy choices link in the storefront footer.',
          ],
        },
        {
          heading: 'Cookies, choices, and contact',
          body: [
            'Cookies or browser storage may support necessary authentication, cart continuity, checkout, payment, security, and preference functionality. Blocking essential storage can prevent account or checkout features from working.',
            'The marketing preference is stored separately from necessary storefront storage and does not affect your ability to shop, check out, pay, or access order support.',
            'Use the Contact page to request access, correction, or deletion where applicable. A request may require identity verification and may be limited by records Gridaan must retain lawfully.',
          ],
        },
      ]}
    />
  );
}
