import InfoPage from '@/components/InfoPage';

export const metadata = {
  title: 'Terms of Service',
  description: 'Basic terms for purchasing from the Gridaan storefront.',
};

export default function TermsPage() {
  return (
    <InfoPage
      eyebrow="Terms"
      title="Terms of Service"
      description="These baseline terms help complete the storefront experience and should be reviewed with the brand’s final policies before launch."
      sections={[
        {
          heading: 'Ordering',
          body: [
            'Orders are accepted subject to stock availability, successful payment verification when applicable, and reasonable fraud checks.',
            'If pricing, availability, or payment confirmation issues occur, the team may contact the customer before dispatch.',
          ],
        },
        {
          heading: 'Product representation',
          body: [
            'Product photography and descriptions are provided as accurately as possible, but minor variations in finish, lighting, and display color may occur.',
            'Before launch, these terms should be replaced or approved with the exact legal wording your brand wants to publish.',
          ],
        },
      ]}
    />
  );
}
