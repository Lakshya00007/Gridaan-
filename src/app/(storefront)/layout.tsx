import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { getProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { getActiveCategories } from '@/server/categories';
import { buildStorefrontWhatsAppLink } from '@/lib/whatsapp';
import {
  buildMetadata,
  buildOrganizationJsonLd,
  buildPreviewNoIndexRobots,
  buildWebsiteJsonLd,
  isPreviewHost,
} from '@/lib/seo';
import { safeJsonLd } from '@/lib/safe-json';

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host') ?? '';
  if (isPreviewHost(host)) {
    return buildMetadata({ robots: buildPreviewNoIndexRobots() });
  }
  return buildMetadata();
}

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [profile, categories] = await Promise.all([getProfile(), getActiveCategories()]);
  const globalJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [buildOrganizationJsonLd(), buildWebsiteJsonLd()],
  };

  return (
    <>
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
      <Footer whatsappHref={buildStorefrontWhatsAppLink()} />
      <CartDrawer />
      <WhatsAppButton />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(globalJsonLd) }}
      />
    </>
  );
}
