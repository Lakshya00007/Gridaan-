import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { Toaster } from 'sonner';
import { buildMetadata, buildOrganizationJsonLd, buildWebsiteJsonLd } from '@/lib/seo';
import { safeJsonLd } from '@/lib/safe-json';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { getProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { getActiveCategories } from '@/server/categories';
import { buildStorefrontWhatsAppLink } from '@/lib/whatsapp';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' });

export const metadata: Metadata = buildMetadata();

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolve session on the server so the header can show the correct
  // login / account state without flashing.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getProfile();
  const categories = await getActiveCategories();
  const whatsappHref = buildStorefrontWhatsAppLink();
  const globalJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [buildOrganizationJsonLd(), buildWebsiteJsonLd()],
  };

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <Header
          categories={categories}
          user={
            user
              ? {
                  id: user.id,
                  email: user.email ?? null,
                  full_name: profile?.full_name ?? null,
                  is_admin: profile?.is_admin ?? false,
                }
              : null
          }
        />
        <main id="main" className="min-h-[60vh]">
          {children}
        </main>
        <Footer whatsappHref={whatsappHref} />
        <CartDrawer />
        <WhatsAppButton />
        <Toaster richColors position="top-center" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(globalJsonLd),
          }}
        />
      </body>
    </html>
  );
}
