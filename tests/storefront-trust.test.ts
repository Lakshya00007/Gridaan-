import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  businessInfo,
  isPublishableSupportEmail,
  isValidIndianGstin,
} from '@/lib/business-info';
import { calculateApprovedReviewSummaries } from '@/lib/reviews';
import { buildPageMetadata, siteConfig, stripGridaanTitleSuffix } from '@/lib/seo';
import { getSafeAuthRedirect } from '@/lib/auth-navigation';

const projectRoot = path.resolve(import.meta.dirname, '..');
const publicSourceRoots = [
  'src/app/(storefront)',
  'src/components/Header.tsx',
  'src/components/Footer.tsx',
  'src/components/CartDrawer.tsx',
  'src/components/ProductCard.tsx',
  'src/components/WhatsAppButton.tsx',
  'src/components/InfoPage.tsx',
  'public',
];

function read(relativePath: string) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function walkSource(entry: string): string[] {
  const absolute = path.join(projectRoot, entry);
  if (!statSync(absolute).isDirectory()) return [absolute];

  return readdirSync(absolute).flatMap((child) => walkAbsolute(path.join(absolute, child)));
}

function walkAbsolute(absolute: string): string[] {
  if (statSync(absolute).isDirectory()) {
    return readdirSync(absolute).flatMap((child) => walkAbsolute(path.join(absolute, child)));
  }
  return /\.(?:ts|tsx|js|jsx|md|json|html|txt)$/.test(absolute) ? [absolute] : [];
}

function readPublicSource() {
  return publicSourceRoots
    .flatMap(walkSource)
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
}

describe('public navigation and admin isolation', () => {
  it('contains no public admin destination while keeping admin server protected', () => {
    const publicSource = readPublicSource();
    const adminLayout = read('src/app/admin/layout.tsx');

    expect(publicSource).not.toMatch(/href\s*=\s*["'{`]\/admin(?:\/dashboard)?/i);
    expect(publicSource).not.toContain('/admin/dashboard');
    expect(adminLayout).toContain('requireAdminRole()');
  });

  it('keeps admin absent from sitemap and marks admin responses noindex', () => {
    const sitemap = read('src/app/sitemap.ts');
    const adminLayout = read('src/app/admin/layout.tsx');
    const config = read('next.config.mjs');

    expect(sitemap).not.toContain("'/admin'");
    expect(adminLayout).toContain("buildNoIndexMetadata('Admin')");
    expect(config).toContain("source: '/admin/:path*'");
    expect(config).toContain("value: 'noindex, nofollow, noarchive'");
  });

  it('uses generic auth failures and rejects unsafe redirect targets', () => {
    const login = read('src/app/(storefront)/login/_view.tsx');

    expect(login).not.toMatch(/setError\((?:e1|e2|error)\.message\)/);
    expect(getSafeAuthRedirect('//malicious.example')).toBe('/');
    expect(getSafeAuthRedirect('https://malicious.example')).toBe('/');
    expect(getSafeAuthRedirect('/account')).toBe('/account');
  });
});

describe('storefront payment and identity content', () => {
  it('contains no unsupported public payment-method copy', () => {
    const publicSource = readPublicSource();
    const forbidden = [
      /\bcod\b/i,
      /cash on delivery/i,
      /manual upi/i,
      /manual payment/i,
      /bank transfer/i,
      /utr submission/i,
      /payment screenshot/i,
    ];

    for (const pattern of forbidden) expect(publicSource).not.toMatch(pattern);
    expect(publicSource).toContain('Secure online payments powered by Razorpay.');
  });

  it('uses the verified business identity from one central source', () => {
    expect(businessInfo).toMatchObject({
      legalName: 'GRIDAAN',
      udyamRegistrationNumber: 'UDYAM-UP-18-0093491',
      businessPhone: '7505459485',
      whatsappNumber: '917505459485',
      canonicalWebsite: 'https://www.gridaan.com',
    });
    expect(businessInfo.address.formatted).toContain(
      'Door 27, Malpura, Subhash Road, Khurja, District Bulandshahar',
    );
  });

  it('removes known fake public phone and city content', () => {
    const publicSource = readPublicSource();

    expect(publicSource).not.toContain('98765 43210');
    expect(publicSource).not.toMatch(/\b(?:Mumbai|Jaipur|Bengaluru)\b/);
    expect(publicSource).not.toContain('from ₹99');
    expect(publicSource).not.toContain('starting ₹99');
  });

  it('rejects placeholder support addresses and invalid registration values', () => {
    expect(isPublishableSupportEmail('support@gridaan.com')).toBe(true);
    expect(isPublishableSupportEmail('example@example.com')).toBe(false);
    expect(isPublishableSupportEmail('support@yourdomain.com')).toBe(false);
    expect(isPublishableSupportEmail('test@test.com')).toBe(false);
    expect(isValidIndianGstin(undefined)).toBe(false);
    expect(read('src/components/Footer.tsx')).toContain('business.gstin ?');
    expect(read('src/app/(storefront)/contact/page.tsx')).toContain('business.gstin ?');
    expect(read('src/lib/env.public.ts')).not.toContain('SUPPORT_EMAIL');
  });
});

describe('canonical policy and metadata rules', () => {
  it('uses the www canonical and normalizes the Gridaan title suffix', () => {
    expect(siteConfig.url).toBe('https://www.gridaan.com');
    expect(stripGridaanTitleSuffix('Privacy Policy | Gridaan')).toBe('Privacy Policy');

    const metadata = buildPageMetadata({
      title: 'Privacy Policy | Gridaan',
      description: 'Privacy details',
      path: '/privacy',
    });
    expect(metadata.title).toBe('Privacy Policy');
    expect(metadata.alternates).toMatchObject({ canonical: 'https://www.gridaan.com/privacy' });
    expect(metadata.openGraph).toMatchObject({ title: 'Privacy Policy | Gridaan' });
  });

  it('redirects legacy policy URLs and publishes only canonical policy routes', () => {
    const config = read('next.config.mjs');
    const sitemap = read('src/app/sitemap.ts');
    const redirects = [
      ["source: '/privacy-policy'", "destination: '/privacy'"],
      ["source: '/terms-and-conditions'", "destination: '/terms'"],
      ["source: '/return-policy'", "destination: '/return-refund-policy'"],
      ["source: '/refund-policy'", "destination: '/return-refund-policy'"],
    ];

    for (const [source, destination] of redirects) {
      expect(config).toContain(source);
      expect(config).toContain(destination);
    }
    expect(sitemap).not.toContain("'/privacy-policy'");
    expect(sitemap).not.toContain("'/terms-and-conditions'");
    expect(sitemap).not.toContain("'/return-policy'");

    for (const route of [
      'privacy',
      'terms',
      'return-refund-policy',
      'cancellation-policy',
      'shipping',
      'faq',
      'help',
      'contact',
    ]) {
      expect(() => read(`src/app/(storefront)/${route}/page.tsx`)).not.toThrow();
    }
  });
});

describe('genuine public review summaries', () => {
  it('returns zero when no approved review rows exist', () => {
    const summaries = calculateApprovedReviewSummaries(['product-1'], []);
    expect(summaries.get('product-1')).toEqual({ rating: 0, review_count: 0 });
  });

  it('calculates a rating only from supplied approved rows', () => {
    const summaries = calculateApprovedReviewSummaries(
      ['product-1'],
      [
        { product_id: 'product-1', rating: 5 },
        { product_id: 'product-1', rating: 4 },
        { product_id: 'other-product', rating: 1 },
      ],
    );

    expect(summaries.get('product-1')).toEqual({ rating: 4.5, review_count: 2 });
    expect(read('src/server/products.ts')).toContain(".eq('status', 'approved')");
    expect(read('src/components/ProductCard.tsx')).toContain(
      'product.review_count > 0 && product.rating > 0',
    );
  });
});

describe('Razorpay checkout regression boundary', () => {
  it('keeps order creation, verification, and CSP contracts intact', () => {
    const checkout = read('src/app/(storefront)/checkout/_view.tsx');
    const config = read('next.config.mjs');

    expect(checkout).toContain("fetch('/api/orders'");
    expect(checkout).toContain("fetch('/api/payments/verify'");
    expect(checkout).toContain('buildCheckoutOrderPayload');
    expect(config).toContain('https://checkout.razorpay.com');
    expect(config).toContain('https://api.razorpay.com');
    expect(config).toContain('https://*.razorpay.com');
  });
});
