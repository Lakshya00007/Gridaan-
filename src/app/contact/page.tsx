import InfoPage from '@/components/InfoPage';

export const metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Gridaan for order help, styling advice, or general support.',
};

export default function ContactPage() {
  return (
    <InfoPage
      eyebrow="Support"
      title="Contact Gridaan"
      description="We’re here to help with styling questions, order updates, gifting, and post-purchase support."
      sections={[
        {
          heading: 'How to reach us',
          body: [
            'Email us at hello@gridaan.com for general support, gifting help, and account-related questions.',
            'You can also use the WhatsApp button on the site for quick pre-purchase questions and order assistance during business hours.',
          ],
        },
        {
          heading: 'Support hours',
          body: [
            'Customer support is typically available Monday to Saturday, 10:00 AM to 7:00 PM IST.',
            'Messages received outside support hours are queued and answered on the next working day.',
          ],
        },
      ]}
    />
  );
}
