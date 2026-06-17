import Link from 'next/link';
import { MessageCircle, ShieldCheck, WalletCards, Truck } from 'lucide-react';
import { getCategoryPageHref } from '@/lib/category-pages';

interface FooterProps {
  whatsappHref?: string | null;
}

export default function Footer({ whatsappHref }: FooterProps) {
  return (
    <footer className="bg-neutral-900 text-white mt-16">
      <div className="border-b border-neutral-800">
        <div className="container py-12 md:py-14">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400 mb-3">
                Gridaan Launch Edit
              </p>
              <h3 className="heading-display text-2xl md:text-3xl mb-3">
                Premium-look jewelry at everyday prices
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Shop women earrings, necklaces, bangles, full jewellery sets, and men&apos;s accessories
                made for festive looks and everyday gifting without the heavy price tag.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/shop" className="btn-gold justify-center">
                Shop Collection
              </Link>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline border-white/20 text-white hover:border-gold-400 hover:text-gold-300 justify-center"
                >
                  Chat on WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="container py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.3fr_0.9fr_0.9fr_1fr]">
          <div>
            <span className="heading-display text-xl">Gridaan</span>
            <p className="mt-4 text-sm leading-relaxed text-neutral-400 max-w-sm">
              Affordable Indian fashion jewelry with a premium look for gifting, festive dressing, and
              everyday styling.
            </p>
          </div>

          <FooterColumn
            title="Shop"
            items={[
              { label: 'Women Earrings', href: getCategoryPageHref('women-earrings') },
              { label: 'Women Necklaces', href: getCategoryPageHref('women-necklaces') },
              { label: 'Bangles & Bracelets', href: getCategoryPageHref('women-bangles-bracelets') },
              { label: 'Full Jewellery Sets', href: getCategoryPageHref('women-full-sets') },
              { label: 'Men Chains', href: getCategoryPageHref('men-chains') },
              { label: 'Men Bracelets', href: getCategoryPageHref('men-bracelets') },
            ]}
          />

          <FooterColumn
            title="Help"
            items={[
              { label: 'Contact Us', href: '/contact' },
              { label: 'Shipping', href: '/shipping' },
              { label: 'FAQ', href: '/faq' },
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Terms of Service', href: '/terms' },
            ]}
          />

          <div>
            <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider">Brand</h4>
            <ul className="space-y-3 text-sm text-neutral-400 mb-5">
              <li>
                <Link href="/about" className="hover:text-gold-400 transition-colors">
                  About Gridaan
                </Link>
              </li>
            </ul>
            <h5 className="text-xs font-semibold mb-3 uppercase tracking-wider text-neutral-500">Why Shop Gridaan</h5>
            <ul className="space-y-3 text-sm text-neutral-400">
              <li className="flex items-start gap-2.5">
                <WalletCards className="w-4 h-4 text-gold-400 mt-0.5 flex-shrink-0" />
                <span>Affordable pricing with premium-look finishes.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Truck className="w-4 h-4 text-gold-400 mt-0.5 flex-shrink-0" />
                <span>COD available and careful packing for gifting.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-gold-400 mt-0.5 flex-shrink-0" />
                <span>Secure checkout powered by Razorpay.</span>
              </li>
              {whatsappHref ? (
                <li className="flex items-start gap-2.5">
                  <MessageCircle className="w-4 h-4 text-gold-400 mt-0.5 flex-shrink-0" />
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gold-300 transition-colors"
                  >
                    Need help choosing a style? Chat with us on WhatsApp.
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-800">
        <div className="container py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-neutral-500">
            © {new Date().getFullYear()} Gridaan. All rights reserved.
          </p>
          <p className="text-[10px] text-neutral-600">Affordable Indian fashion jewelry with a premium look.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider">{title}</h4>
      <ul className="space-y-2.5">
        {items.map((it) => (
          <li key={it.href}>
            <Link href={it.href} className="text-sm text-neutral-400 hover:text-gold-400 transition-colors">
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
