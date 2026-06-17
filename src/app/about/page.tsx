import InfoPage from '@/components/InfoPage';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'About Gridaan | Affordable Indian Fashion Jewelry',
  description:
    'Learn about Gridaan, an Indian fashion jewelry brand offering premium-look earrings, necklace sets, combo packs, wedding guest jewelry, and daily wear accessories at affordable prices.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="About"
      title="About Gridaan"
      description="Gridaan is built for shoppers who want affordable Indian fashion jewelry with a premium look for festive dressing, gifting, and everyday styling."
      sections={[
        {
          heading: 'What Gridaan offers',
          body: [
            'Gridaan focuses on fashion jewelry that feels elevated without feeling expensive. The collection includes earrings, necklace sets, combo packs, wedding guest jewelry, and daily wear jewelry for different occasions and budgets.',
            'Our goal is simple: make premium-look jewelry accessible for repeat wear, festive looks, quick gifting, and everyday styling across India.',
          ],
        },
        {
          heading: 'Premium-look jewelry at budget prices',
          body: [
            'We curate styles that photograph beautifully, style easily, and help customers get dressed up without paying luxury prices.',
            'Whether you are shopping for statement earrings, coordinated necklace sets, or value combo packs, Gridaan is designed around affordable fashion choices that still feel polished.',
          ],
        },
        {
          heading: 'Customer-first shopping experience',
          body: [
            'Gridaan is built to keep shopping straightforward with clean product browsing, secure online payments, and Cash on Delivery availability where applicable.',
            'We want customers to feel confident before and after they place an order, from product selection to delivery updates and support.',
          ],
        },
      ]}
    />
  );
}
