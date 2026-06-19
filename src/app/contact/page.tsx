import Link from 'next/link';
import InfoPage from '@/components/InfoPage';
import {
  BUSINESS_CATEGORY,
  JEWELLERY_COMPLIANCE_DISCLAIMER,
  buildSupportEmailHref,
  buildSupportPhoneHref,
  publicBusinessConfig,
} from '@/lib/business';
import { buildPageMetadata } from '@/lib/seo';
import { buildStorefrontWhatsAppLink } from '@/lib/whatsapp';

export const metadata = buildPageMetadata({
  title: 'Contact Gridaan | Customer Support',
  description:
    'Contact Gridaan for support with artificial fashion jewellery orders, payments, shipping, returns, and product questions.',
  path: '/contact',
});

export default function ContactPage() {
  const whatsappHref = buildStorefrontWhatsAppLink();
  const phoneHref = publicBusinessConfig.supportPhone
    ? buildSupportPhoneHref(publicBusinessConfig.supportPhone)
    : null;
  const emailHref = publicBusinessConfig.supportEmail
    ? buildSupportEmailHref(publicBusinessConfig.supportEmail)
    : null;

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
            'For payment verification or delivery help, please include your order number.',
            'Support can help with manual payment follow-up, address correction requests before dispatch, delivery questions, and product-related concerns.',
          ],
        },
        {
          heading: 'Support hours',
          body: [
            'Customer support is generally available Monday to Saturday during standard business hours in India.',
            'Messages received outside active hours are usually handled on the next working day.',
          ],
        },
        {
          heading: 'Business identity',
          body: [
            `Brand name: ${publicBusinessConfig.brandName}.`,
            `Business/legal name: ${publicBusinessConfig.businessName}.`,
            BUSINESS_CATEGORY,
            JEWELLERY_COMPLIANCE_DISCLAIMER,
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

        {publicBusinessConfig.supportPhone ? (
          <a
            href={phoneHref ?? undefined}
            target={phoneHref?.startsWith('https://') ? '_blank' : undefined}
            rel={phoneHref?.startsWith('https://') ? 'noopener noreferrer' : undefined}
            className="rounded-2xl border border-neutral-200 p-5 hover:border-gold-400 transition-colors"
          >
            <p className="text-sm font-semibold text-neutral-900 mb-2">Support phone</p>
            <p className="text-sm text-neutral-600">{publicBusinessConfig.supportPhone}</p>
          </a>
        ) : null}

        {publicBusinessConfig.supportEmail ? (
          <a
            href={emailHref ?? undefined}
            className="rounded-2xl border border-neutral-200 p-5 hover:border-gold-400 transition-colors"
          >
            <p className="text-sm font-semibold text-neutral-900 mb-2">Support email</p>
            <p className="text-sm text-neutral-600">{publicBusinessConfig.supportEmail}</p>
          </a>
        ) : null}

        {publicBusinessConfig.businessAddress ? (
          <div className="rounded-2xl border border-neutral-200 p-5">
            <p className="text-sm font-semibold text-neutral-900 mb-2">Business city/state or address</p>
            <p className="text-sm text-neutral-600">{publicBusinessConfig.businessAddress}</p>
          </div>
        ) : null}

        {publicBusinessConfig.returnAddress ? (
          <div className="rounded-2xl border border-neutral-200 p-5">
            <p className="text-sm font-semibold text-neutral-900 mb-2">Return/support address</p>
            <p className="text-sm text-neutral-600">{publicBusinessConfig.returnAddress}</p>
          </div>
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
