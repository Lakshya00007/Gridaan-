import InfoPage from '@/components/InfoPage';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Help Center | Gridaan',
  description:
    'Get help with orders, payments, shipping, returns, cancellations, and jewelry care at Gridaan.',
  path: '/help',
});

export default function HelpPage() {
  return (
    <InfoPage
      eyebrow="Help"
      title="Help Center"
      description="Everything customers usually need before or after placing a Gridaan order, from payment questions to shipping and jewelry care guidance."
      sections={[
        {
          heading: 'Orders',
          body: [
            'Use your order confirmation page and account area to review recent orders, payment status, and order progress after checkout.',
            'If something looks incorrect after placing an order, contact support as early as possible with your order number so the team can review it before dispatch.',
          ],
        },
        {
          heading: 'Payments',
          body: [
            'Gridaan supports secure online payments through Razorpay and Cash on Delivery where available.',
            'If a payment attempt is interrupted, pending online orders can usually be retried from the order confirmation flow.',
          ],
        },
        {
          heading: 'Shipping',
          body: [
            'Orders are shipped across India, and dispatch timelines may vary slightly during high-volume sale periods, festive seasons, or public holidays.',
            'Shipping charges and free-shipping eligibility, if any, are shown during the shopping and checkout flow.',
          ],
        },
        {
          heading: 'Returns',
          body: [
            'If an item arrives damaged, incorrect, or has a clear issue, contact support promptly with photos and your order number for review.',
            'Return, replacement, or exchange decisions can depend on product condition, category, and the nature of the issue reported.',
          ],
        },
        {
          heading: 'Product care',
          body: [
            'Fashion and imitation jewelry should be stored in a dry place and kept away from water, perfume, lotion, and direct moisture to help preserve finish and shine.',
            'Wipe pieces gently after use and store them separately to reduce tangling, scratches, and plating wear over time.',
          ],
        },
        {
          heading: 'Contact support',
          body: [
            'For order help, shipping questions, payment concerns, or product queries, use the contact options listed on the Contact page.',
            'Sharing your order number whenever possible helps the support team respond faster.',
          ],
        },
      ]}
    />
  );
}
