import InfoPage from '@/components/InfoPage';

export const metadata = {
  title: 'Privacy Policy',
  description: 'High-level privacy information for the Gridaan storefront.',
};

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Privacy"
      title="Privacy Policy"
      description="This high-level privacy page explains the kinds of information the storefront uses to process orders and support customers."
      sections={[
        {
          heading: 'Information we use',
          body: [
            'Order processing requires customer details such as name, phone number, delivery address, and optional email address.',
            'Authenticated accounts may also store profile details and wishlists to improve the customer experience across visits.',
          ],
        },
        {
          heading: 'How the information is used',
          body: [
            'Information is used to process orders, provide support, send relevant order updates, and secure the storefront against abuse.',
            'Before launch, this page should be reviewed and customized to match the brand’s actual retention, deletion, and contact practices.',
          ],
        },
      ]}
    />
  );
}
