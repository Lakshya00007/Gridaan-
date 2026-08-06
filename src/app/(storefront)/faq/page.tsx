import Link from 'next/link';
import InfoPage from '@/components/InfoPage';
import { getPublishedBusinessInfo } from '@/lib/business-info.server';
import { JEWELLERY_COMPLIANCE_DISCLAIMER } from '@/lib/business-info';
import { safeJsonLd } from '@/lib/safe-json';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Frequently Asked Questions',
  description:
    'Answers about Gridaan artificial and imitation jewellery, secure online payments, shipping, returns, and product care.',
  path: '/faq',
});

export default function FaqPage() {
  const business = getPublishedBusinessInfo();
  const deliveryAnswer = business.operations.deliveryEstimate
    ? `The configured normal-area delivery estimate is ${business.operations.deliveryEstimate}. Destination serviceability and carrier conditions can affect an estimate.`
    : 'Delivery timing depends on destination serviceability and the assigned carrier. Contact support with an order number for the current dispatch or delivery status.';
  const faqs = [
    {
      question: 'What does Gridaan sell?',
      answer:
        "Gridaan sells affordable Indian artificial, imitation, and fashion jewellery, including women's earrings, necklaces, bangles, bracelets, rings, anklets, hair jewellery, full sets, and men's fashion accessories.",
    },
    {
      question: 'How can I pay?',
      answer:
        'Secure online payments powered by Razorpay. Pay securely using UPI, cards, net banking and other payment methods supported by Razorpay. An order is placed only after captured payment is verified.',
    },
    {
      question: 'How long does delivery take?',
      answer: deliveryAnswer,
    },
    {
      question: 'Are products real gold?',
      answer: `No. ${JEWELLERY_COMPLIANCE_DISCLAIMER}`,
    },
    {
      question: 'How do I track my order?',
      answer:
        'Use the order confirmation or account area where tracking is available, or contact support with your order number for help.',
    },
    {
      question: 'Can I return jewellery?',
      answer:
        'A product marked return-eligible may be requested for return within 7 calendar days of delivery if it is unused and in original packaging. Report a damaged, incorrect, or missing item within 48 hours with the order number and clear photographs. See the Return & Refund Policy for the complete terms.',
    },
    {
      question: 'How do I contact support?',
      answer: `Use the Contact page for verified contact options. Include your order number when available. The business mobile is +91 ${business.businessPhone}.`,
    },
    {
      question: 'How should I care for fashion jewellery?',
      answer:
        'Follow the care instructions shown for the product when available. In general, avoid moisture, perfume, and abrasive contact, and store pieces separately in a dry place.',
    },
  ];
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <InfoPage
        eyebrow="FAQs"
        title="Frequently Asked Questions"
        description="Answers about Gridaan artificial and imitation jewellery, orders, delivery, secure online payment, returns, and care."
        sections={faqs.map((item) => ({ heading: item.question, body: [item.answer] }))}
      >
        <div className="rounded-2xl bg-warm-50 p-5">
          <p className="mb-2 text-sm font-semibold text-neutral-900">Still need help?</p>
          <p className="text-sm text-neutral-600">
            Visit{' '}
            <Link href="/contact" className="text-gold-700 hover:text-gold-800">
              Contact Gridaan
            </Link>{' '}
            if your question is not covered here.
          </p>
        </div>
      </InfoPage>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />
    </>
  );
}
