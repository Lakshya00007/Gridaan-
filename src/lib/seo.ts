import type { Metadata } from 'next';
import { publicEnv } from './env.public';

export const siteConfig = {
  name: 'Gridaan',
  title: 'Gridaan - Premium Fashion Jewelry',
  description:
    'Shop premium fashion jewelry, artificial jewelry, Korean jewelry, oxidized jewelry, bridal sets and daily wear accessories at affordable prices.',
  url: publicEnv.NEXT_PUBLIC_SITE_URL,
  logo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/logo.svg`,
  ogImage: `${publicEnv.NEXT_PUBLIC_SITE_URL}/og.svg`,
  locale: 'en_IN',
  twitter: '@gridaan',
  contact: {
    phone: '+91-98765-43210',
    email: 'hello@gridaan.com',
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
