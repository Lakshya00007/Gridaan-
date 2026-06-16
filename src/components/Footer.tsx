'use client';
import Link from 'next/link';
import { Mail, Phone, MapPin, Instagram, Facebook, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-neutral-900 text-white mt-16">
      <div className="border-b border-neutral-800">
        <div className="container py-12 md:py-16">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="heading-display text-2xl md:text-3xl mb-3">Stay in the Glow</h3>
            <p className="text-neutral-400 text-sm mb-6">
              Subscribe for exclusive deals, new arrivals, and style inspiration.
            </p>
            <NewsletterForm />
          </div>
        </div>
      </div>

      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-1.5 mb-4">
              <span className="heading-display text-xl">Lumiere</span>
              <span className="heading-italic text-gold-400">Jewels</span>
            </div>
            <p className="text-neutral-400 text-sm leading-relaxed mb-6">
              Premium fashion jewelry for the modern woman. Affordable elegance for every occasion.
            </p>
            <div className="flex gap-2.5">
              {[
                { Icon: Instagram, label: 'Instagram' },
                { Icon: Facebook, label: 'Facebook' },
                { Icon: Twitter, label: 'Twitter' },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-10 h-10 rounded-full bg-neutral-800 hover:bg-gold-500 flex items-center justify-center transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <FooterColumn
            title="Shop"
            items={[
              { label: 'Earrings', href: '/shop?category=earrings' },
              { label: 'Necklaces', href: '/shop?category=necklaces' },
              { label: 'Rings', href: '/shop?category=rings' },
              { label: 'Bracelets', href: '/shop?category=bracelets' },
              { label: 'Bridal Sets', href: '/shop?category=bridal-sets' },
            ]}
          />

          <FooterColumn
            title="Help"
            items={[
              { label: 'Contact Us', href: '/contact' },
              { label: 'Shipping & Returns', href: '/shipping' },
              { label: 'FAQ', href: '/faq' },
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Terms of Service', href: '/terms' },
            ]}
          />

          <div>
            <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider">Contact</h4>
            <ul className="space-y-3 text-sm text-neutral-400">
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-gold-400 mt-0.5 flex-shrink-0" />
                <a href="tel:+919876543210" className="hover:text-gold-400">
                  +91 98765 43210
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-gold-400 mt-0.5 flex-shrink-0" />
                <a
                  href="mailto:hello@lumierejewels.com"
                  className="hover:text-gold-400 break-all"
                >
                  hello@lumierejewels.com
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-gold-400 mt-0.5 flex-shrink-0" />
                <span>Mumbai, Maharashtra, India</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-800">
        <div className="container py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-neutral-500">
            © {new Date().getFullYear()} Lumiere Jewels. All rights reserved.
          </p>
          <p className="text-[10px] text-neutral-600">
            Secured by Razorpay · Powered by Supabase
          </p>
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

function NewsletterForm() {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Hook up to your provider here (Resend, Mailchimp, etc.)
      }}
      className="flex gap-2"
    >
      <input
        type="email"
        required
        placeholder="Enter your email"
        className="flex-1 px-5 py-3 bg-neutral-800 rounded-full border border-neutral-700 text-sm placeholder:text-neutral-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none transition-all"
      />
      <button className="px-6 py-3 bg-gold-500 hover:bg-gold-600 rounded-full text-sm font-medium transition-colors">
        Subscribe
      </button>
    </form>
  );
}
