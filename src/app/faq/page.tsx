import InfoPage from '@/components/InfoPage';
import { safeJsonLd } from '@/lib/safe-json';
import { buildPageMetadata, absoluteUrl } from '@/lib/seo';

const faqs = [
  {
    question: 'What does Gridaan sell?',
    answer:
      'Gridaan sells affordable Indian fashion and imitation jewelry including earrings, necklace sets, combo packs, wedding guest jewelry, and daily wear accessories.',
  },
  {
    question: 'Is Cash on Delivery available?',
    answer:
      'Cash on Delivery may be available on eligible orders and serviceable locations within India. Final availability is shown during checkout.',
  },
  {
    question: 'How long does delivery take?',
    answer:
      'Delivery timing can vary by location, courier reach, holidays, and sale periods. Orders are usually processed before dispatch and then delivered within a standard shipping window.',
  },
  {
    question: 'Are products real gold?',
    answer:
      'No. Gridaan currently focuses on fashion and imitation jewelry, not certified real gold or diamond jewelry, unless clearly stated otherwise on a specific product in the future.',
  },
  {
    question: 'How do I track my order?',
    answer:
      'You can check your order progress through the account and order confirmation flow where available, or contact support with your order number for help.',
  },
  {
    question: 'Can I return or exchange jewelry?',
    answer:
      'If you receive a damaged, incorrect, or clearly problematic item, contact support quickly with your order number and photos so the team can review the issue.',
  },
  {
    question: 'How do I contact support?',
    answer:
      'Visit the Contact page for current support options. WhatsApp support may be available when configured on the storefront.',
  },
  {
    question: 'How should I care for fashion jewelry?',
    answer:
      'Keep jewelry away from water, perfume, and direct moisture. Store it in a dry place and wipe it gently after use to help preserve its finish.',
  },
];

export const metadata = buildPageMetadata({
  title: 'FAQs | Gridaan Jewelry',
  description:
    'Find answers to common questions about Gridaan jewelry, orders, payments, shipping, COD, returns, and product care.',
  path: '/faq',
});

export default function FaqPage() {
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
        description="Answers to common questions about Gridaan jewelry, orders, delivery, COD availability, returns, and product care."
        sections={faqs.map((item) => ({
          heading: item.question,
          body: [item.answer],
        }))}
      >
        <div className="rounded-2xl bg-warm-50 p-5">
          <p className="text-sm font-semibold text-neutral-900 mb-2">Still need help?</p>
          <p className="text-sm text-neutral-600">
            Visit <a href={absoluteUrl('/contact')} className="text-gold-700 hover:text-gold-800">Contact Gridaan</a> if your question is not covered here.
          </p>
        </div>
      </InfoPage>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />
    </>
  );
}
