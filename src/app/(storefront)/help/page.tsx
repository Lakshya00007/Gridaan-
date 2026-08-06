import InfoPage from '@/components/InfoPage';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Help Center',
  description:
    'Get help with Gridaan orders, secure payment, shipping, cancellations, returns, and fashion jewellery care.',
  path: '/help',
});

export default function HelpPage() {
  return (
    <InfoPage
      eyebrow="Help"
      title="Help Center"
      description="Practical guidance for ordering Gridaan artificial and imitation fashion jewellery."
      sections={[
        {
          heading: 'Orders',
          body: [
            'Use your order confirmation or account area to review paid orders and status updates where available.',
            'An order is placed only after the expected payment is securely verified as captured. Include the order number whenever you contact support about a placed order.',
          ],
        },
        {
          heading: 'Payments',
          body: [
            'Secure online payments powered by Razorpay.',
            'Pay securely using UPI, cards, net banking and other payment methods supported by Razorpay.',
            'Do not send anyone your card number, CVV, UPI PIN, OTP, or banking password.',
          ],
        },
        {
          heading: 'Shipping',
          body: [
            'Current shipping charges, service region, and any verified operational estimates are published on the Shipping page.',
            'Contact support with an order number if you need help with an active delivery.',
          ],
        },
        {
          heading: 'Cancellations and returns',
          body: [
            'Contact support as early as possible for a cancellation request. Dispatch can limit the available options.',
            'Return-eligible unused products have a 7-calendar-day request window. Report damaged, incorrect, or missing items within 48 hours of delivery. Read the complete policies before submitting a request.',
          ],
        },
        {
          heading: 'Product care',
          body: [
            'Follow product-specific care instructions when shown. Keep fashion jewellery dry, avoid perfume and abrasive contact, and store pieces separately to reduce wear.',
          ],
        },
        {
          heading: 'Contact support',
          body: [
            'Use only the verified phone, WhatsApp, address, and optional email shown on the Contact page.',
            'Include the order number and a concise description of the issue. Never include sensitive payment credentials.',
          ],
        },
      ]}
    />
  );
}
