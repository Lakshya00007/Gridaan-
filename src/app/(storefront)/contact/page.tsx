import Link from 'next/link';
import InfoPage from '@/components/InfoPage';
import { getPublishedBusinessInfo } from '@/lib/business-info.server';
import {
  BRAND_POSITIONING,
  buildBusinessPhoneHref,
  buildBusinessWhatsAppHref,
  buildSupportEmailHref,
} from '@/lib/business-info';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Contact & Customer Support',
  description:
    'Contact Gridaan for support with artificial fashion jewellery orders, payments, shipping, returns, and product questions.',
  path: '/contact',
});

export default function ContactPage() {
  const business = getPublishedBusinessInfo();
  const whatsappHref = buildBusinessWhatsAppHref(
    'Hello Gridaan, I need help with an order or product.',
  );

  return (
    <InfoPage
      eyebrow="Contact"
      title="Contact Gridaan"
      description="Use the verified business contact details below for order, payment, delivery, return, or product support."
      sections={[
        {
          heading: 'Order support',
          body: [
            'Please include your order number when contacting us about a paid order. Do not send card details, CVV, UPI PIN, OTP, banking passwords, or other sensitive payment credentials.',
            'For an address correction or cancellation request, contact us as early as possible. A request may not be actionable after dispatch.',
          ],
        },
        {
          heading: 'Business information',
          body: [
            `${business.legalName}.`,
            business.address.formatted,
            `Udyam Registration Number: ${business.udyamRegistrationNumber}.`,
            BRAND_POSITIONING,
          ],
        },
        ...(business.grievance
          ? [
              {
                heading: 'Grievance contact',
                body: [
                  `Grievance contact: ${business.grievance.name}.`,
                  `Email: ${business.grievance.email}. Contact method: ${business.grievance.contactMethod}.`,
                  business.grievance.responseExpectation,
                ],
              },
            ]
          : []),
      ]}
      backHref="/help"
      backLabel="Visit help center"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border border-neutral-200 p-5 transition-colors hover:border-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        >
          <p className="mb-2 text-sm font-semibold text-neutral-900">WhatsApp support</p>
          <p className="text-sm text-neutral-600">+91 {business.businessPhone}</p>
        </a>

        <a
          href={buildBusinessPhoneHref()}
          className="rounded-2xl border border-neutral-200 p-5 transition-colors hover:border-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        >
          <p className="mb-2 text-sm font-semibold text-neutral-900">Business mobile</p>
          <p className="text-sm text-neutral-600">+91 {business.businessPhone}</p>
        </a>

        {business.supportEmail ? (
          <a
            href={buildSupportEmailHref(business.supportEmail)}
            className="rounded-2xl border border-neutral-200 p-5 transition-colors hover:border-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
          >
            <p className="mb-2 text-sm font-semibold text-neutral-900">Support email</p>
            <p className="break-all text-sm lowercase text-neutral-600">{business.supportEmail}</p>
          </a>
        ) : null}

        <div className="rounded-2xl border border-neutral-200 p-5 md:col-span-2">
          <p className="mb-2 text-sm font-semibold text-neutral-900">Registered/correspondence address</p>
          <address className="text-sm not-italic leading-6 text-neutral-600">
            {business.address.line1}
            <br />
            {business.address.line2}
            <br />
            {business.address.stateAndPostcode}, {business.address.country}
          </address>
          <p className="mt-3 text-sm text-neutral-600">
            Udyam Registration Number: {business.udyamRegistrationNumber}
          </p>
          {business.gstin ? <p className="mt-1 text-sm text-neutral-600">GSTIN: {business.gstin}</p> : null}
        </div>

        <div className="rounded-2xl border border-neutral-200 p-5 md:col-span-2">
          <p className="mb-2 text-sm font-semibold text-neutral-900">Self-service information</p>
          <p className="mb-3 text-sm text-neutral-600">
            Review payment, delivery, cancellation, return, and jewellery-care guidance in the help center.
          </p>
          <Link href="/help" className="text-sm font-medium text-gold-700 hover:text-gold-800">
            Open Help Center
          </Link>
        </div>
      </div>
    </InfoPage>
  );
}
