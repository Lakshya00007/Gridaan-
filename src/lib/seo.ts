import type { Metadata } from 'next';
import { publicEnv } from './env.public';

export const siteConfig = {
  name: 'Gridaan',
  title: 'Gridaan - Premium Fashion Jewelry',
  description:
    'Shop affordable Indian fashion jewelry with a premium look, including earrings, necklace sets, combo packs, wedding guest styles, and daily wear picks.',
  url: publicEnv.NEXT_PUBLIC_SITE_URL,
  logo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/logo.svg`,
  ogImage: `${publicEnv.NEXT_PUBLIC_SITE_URL}/og.svg`,
  locale: 'en_IN',
  twitter: '@gridaan',
  contact: {} as {
    phone?: string;
    email?: string;
  },
};

export function absoluteUrl(path: string) {
  return `${siteConfig.url}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildMetadata(overrides: Partial<Metadata> = {}): Metadata {
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: siteConfig.title, template: `%s | ${siteConfig.name}` },
    description: siteConfig.description,
    icons: {
      icon: '/logo.svg',
      shortcut: '/logo.svg',
      apple: '/logo.svg',
    },
    keywords: [
      'fashion jewelry',
      'artificial jewelry',
      'Indian jewelry',
      'earrings',
      'necklace sets',
      'combo packs',
      'wedding guest jewelry',
      'daily wear jewelry',
      'affordable fashion jewelry',
    ],
    openGraph: {
      type: 'website',
      locale: siteConfig.locale,
      url: siteConfig.url,
      siteName: siteConfig.name,
      title: siteConfig.title,
      description: siteConfig.description,
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: siteConfig.title,
      description: siteConfig.description,
      images: [siteConfig.ogImage],
      creator: siteConfig.twitter,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: { canonical: siteConfig.url },
    ...overrides,
  };
}
