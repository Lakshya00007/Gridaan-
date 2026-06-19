import InfoPage from '@/components/InfoPage';
import { BUSINESS_CATEGORY, JEWELLERY_COMPLIANCE_DISCLAIMER } from '@/lib/business';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'About Gridaan | Affordable Artificial Fashion Jewellery',
  description:
    "Learn about Gridaan, an Indian artificial and imitation fashion jewellery brand offering premium-look women's earrings, necklaces, full jewellery sets, men's accessories, COD, and manual UPI options.",
  path: '/about',
});

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="About"
      title="About Gridaan"
      description="Gridaan is built for shoppers who want affordable Indian artificial and imitation fashion jewellery with a premium look for festive dressing, gifting, and everyday styling."
      sections={[
        {
          heading: 'What Gridaan offers',
          body: [
            "Gridaan focuses on artificial, imitation, and fashion jewellery that feels elevated without feeling expensive. The collection includes women's earrings, necklaces, bangles, bracelets, rings, anklets, hair jewellery, full sets, and men's chains, pendants, kadas, bracelets, rings, and ear studs.",
            'Our goal is simple: make premium-look fashion jewellery accessible for repeat wear, festive looks, quick gifting, and everyday styling across India.',
          ],
        },
        {
          heading: 'Premium-look fashion jewellery at budget prices',
          body: [
            'We curate styles that photograph beautifully, style easily, and help customers get dressed up without paying luxury prices.',
            "Whether you are shopping for statement women's earrings, coordinated jewellery sets, or bold men's accessories, Gridaan is designed around affordable fashion choices that still feel polished.",
          ],
        },
        {
          heading: 'Artificial and imitation jewellery only',
          body: [
            JEWELLERY_COMPLIANCE_DISCLAIMER,
            BUSINESS_CATEGORY,
          ],
        },
        {
          heading: 'Customer-first shopping experience',
          body: [
            'Gridaan is built to keep shopping straightforward with clean product browsing, Cash on Delivery availability where applicable, and manual UPI payment verification before dispatch.',
            'We want customers to feel confident before and after they place an order, from product selection to delivery updates and support.',
          ],
        },
        {
          heading: 'Packing and support',
          body: [
            'Orders are packed carefully for delivery, gifting, and everyday use. If you need help with payment verification or delivery, please contact support with your order number.',
            'Manual UPI and bank-transfer payments are reviewed by the Gridaan team before an order is confirmed for dispatch.',
          ],
        },
      ]}
    />
  );
}
