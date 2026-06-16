import InfoPage from '@/components/InfoPage';

export const metadata = {
  title: 'Shipping & Returns',
  description: 'Review Gridaan shipping timelines, delivery expectations, and return guidelines.',
};

export default function ShippingPage() {
  return (
    <InfoPage
      eyebrow="Delivery"
      title="Shipping & Returns"
      description="Clear expectations help customers buy confidently, so this page covers delivery timing and return basics."
      sections={[
        {
          heading: 'Shipping',
          body: [
            'Orders are usually processed within 1 to 2 business days. Dispatch timelines may be slightly longer during sale periods or public holidays.',
            'Free shipping applies to qualifying orders based on the threshold displayed in the cart and checkout experience.',
          ],
        },
        {
          heading: 'Returns and exchanges',
          body: [
            'If an item arrives damaged or incorrect, contact support promptly with your order number and clear photos so the team can review the issue.',
            'For hygiene and product-care reasons, some categories may not be eligible for return after opening or use. Final policy wording should be reviewed before launch.',
          ],
        },
      ]}
    />
  );
}
