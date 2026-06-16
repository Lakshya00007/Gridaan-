import InfoPage from '@/components/InfoPage';

export const metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about ordering from Gridaan.',
};

export default function FaqPage() {
  return (
    <InfoPage
      eyebrow="FAQ"
      title="Frequently Asked Questions"
      description="Quick answers to common questions about ordering, payments, care, and customer support."
      sections={[
        {
          heading: 'Orders and payments',
          body: [
            'Gridaan supports secure online payments through Razorpay as well as cash on delivery where available.',
            'If a payment succeeds but the confirmation page does not load, contact support with the payment reference so the order can be verified quickly.',
          ],
        },
        {
          heading: 'Jewelry care',
          body: [
            'Store fashion jewelry in a dry place away from perfumes, lotions, and direct moisture to help preserve finish and shine.',
            'Wipe pieces gently with a soft cloth after use and keep individual items separated to reduce scratching or tangling.',
          ],
        },
      ]}
    />
  );
}
