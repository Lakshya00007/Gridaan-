import Link from 'next/link';
import InfoPage from '@/components/InfoPage';
import { buildPageMetadata } from '@/lib/seo';
import { buildStorefrontWhatsAppLink } from '@/lib/whatsapp';

export const metadata = buildPageMetadata({
  title: 'Contact Gridaan | Customer Support',
  description:
    'Contact Gridaan for support with jewelry orders, payments, shipping, returns, and product questions.',
  path: '/contact',
});

export default function ContactPage() {
  const whatsappHref = buildStorefrontWhatsAppLink();

  return (
    <InfoPage
      eyebrow="Contact"
      title="Contact Gridaan"
      description="Reach out for help with orders, payment issues, shipping questions, support requests, and product selection."
      sections={[
        {
          heading: 'Order help',
          body: [
            'If you need help with an order, please keep your order number ready when you contact support so the team can respond faster.',
            'Support can help with payment follow-up, address correction requests before dispatch, delivery questions, and product-related concerns.',
          ],
        },
        {
          heading: 'Support hours',
          body: [
            'Customer support is generally available Monday to Saturday during standard business hours in India.',
            'Messages received outside active hours are usually handled on the next working day.',
          ],
        },
      ]}
      backHref="/help"
      backLabel="Visit help center"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-neutral-200 p-5 hover:border-gold-400 transition-colors"
          >
            <p className="text-sm font-semibold text-neutral-900 mb-2">WhatsApp support</p>
            <p className="text-sm text-neutral-600">
              Use WhatsApp for quick order updates, product questions, and pre-purchase help.
            </p>
          </a>
        ) : null}

        <div className="rounded-2xl border border-neutral-200 p-5">
          <p className="text-sm font-semibold text-neutral-900 mb-2">Need another route?</p>
          <p className="text-sm text-neutral-600 mb-3">
            You can also visit the help center for shipping, returns, care, and payment guidance.
          </p>
          <Link href="/help" className="text-sm font-medium text-gold-700 hover:text-gold-800">
            Open Help Center
          </Link>
        </div>
      </div>
    </InfoPage>
  );
}
