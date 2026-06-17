import type { Metadata } from 'next';

export const siteConfig = {
  name: 'Gridaan',
  title: 'Gridaan | Affordable Indian Fashion Jewellery',
  description:
    "Shop affordable Indian fashion jewellery online at Gridaan. Explore women’s earrings, necklaces, full jewellery sets, men’s chains, bracelets, rings, and festive gifting styles.",
  url: 'https://www.gridaan.com',
  logo: 'https://www.gridaan.com/logo-search.png',
  icon: 'https://www.gridaan.com/icon.png',
  ogImage: 'https://www.gridaan.com/og-card.png',
  locale: 'en_IN',
  twitterHandle: undefined as string | undefined,
  socialLinks: [] as string[],
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
    applicationName: siteConfig.name,
    icons: {
      icon: [
        { url: '/favicon.ico' },
        { url: '/icon.png', type: 'image/png', sizes: '512x512' },
      ],
      shortcut: ['/favicon.ico'],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    },
    keywords: [
      'fashion jewellery',
      'Indian fashion jewellery',
      'women earrings',
      'women necklaces',
      'full jewellery sets',
      'men chains',
      'men bracelets',
      'men rings',
      'affordable fashion jewellery',
      'premium-look jewellery',
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
      ...(siteConfig.twitterHandle ? { creator: siteConfig.twitterHandle } : {}),
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
      ...(siteConfig.twitterHandle ? { creator: siteConfig.twitterHandle } : {}),
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
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    logo: siteConfig.logo,
    description: siteConfig.description,
  } as Record<string, unknown>;

  if (siteConfig.socialLinks.length > 0) {
    organization.sameAs = siteConfig.socialLinks;
  }

  return organization;
}

export function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteConfig.url}/shop?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function toAbsoluteAssetUrl(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return absoluteUrl(value);
}

export function buildPreviewNoIndexRobots(): Metadata['robots'] {
  return {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-image-preview': 'none',
      'max-snippet': 0,
    },
  };
}

export function isPreviewHost(host: string) {
  const normalizedHost = host.toLowerCase().split(':')[0];
  return normalizedHost.endsWith('.vercel.app');
}

export function buildWebsiteJsonLd() {
  return buildWebSiteJsonLd();
}
