import type { Metadata } from 'next';
import { env } from './env';

export const siteConfig = {
  name: 'Lumiere Jewels',
  title: 'Lumiere Jewels - Premium Fashion Jewelry',
  description:
    'Shop premium fashion jewelry, artificial jewelry, Korean jewelry, oxidized jewelry, bridal sets and daily wear accessories at affordable prices.',
  url: env.NEXT_PUBLIC_SITE_URL,
  ogImage: `${env.NEXT_PUBLIC_SITE_URL}/og.png`,
  locale: 'en_IN',
  twitter: '@lumierejewels',
  contact: {
    phone: '+91-98765-43210',
    email: 'hello@lumierejewels.com',
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
    keywords: [
      'fashion jewelry',
      'artificial jewelry',
      'Korean jewelry',
      'oxidized jewelry',
      'bridal sets',
      'Indian jewelry',
      'affordable luxury',
      'daily wear jewelry',
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
