import type { Metadata } from 'next';

export const siteConfig = {
  name: 'Gridaan',
  title: 'Gridaan | Affordable Indian Fashion Jewelry',
  description:
    'Shop affordable Indian fashion jewelry online at Gridaan. Explore earrings, necklace sets, combo packs, wedding guest jewelry, and daily wear jewelry with a premium look.',
  url: 'https://www.gridaan.com',
  logo: 'https://www.gridaan.com/logo.svg',
  ogImage: 'https://www.gridaan.com/og.svg',
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
      'Indian jewelry',
      'earrings',
      'necklace sets',
      'combo packs',
      'wedding guest jewelry',
      'daily wear jewelry',
      'affordable fashion jewelry',
      'premium-look jewelry',
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

export function buildPageMetadata({
  title,
  description,
  path,
  keywords,
  robots,
  openGraphImage,
}: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  robots?: Metadata['robots'];
  openGraphImage?: string;
}): Metadata {
  const url = absoluteUrl(path);

  return buildMetadata({
    title,
    description,
    keywords,
    robots,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: siteConfig.name,
      images: [{ url: openGraphImage ?? siteConfig.ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [openGraphImage ?? siteConfig.ogImage],
      creator: siteConfig.twitter,
    },
  });
}

export function buildNoIndexMetadata(title: string, description?: string): Metadata {
  return buildMetadata({
    title,
    description: description ?? siteConfig.description,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
        'max-image-preview': 'none',
        'max-snippet': 0,
      },
    },
  });
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    logo: siteConfig.logo,
    description: siteConfig.description,
  };
}

export function buildWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
  };
}
