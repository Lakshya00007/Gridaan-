import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import ProductCard from '@/components/ProductCard';
import { categoryPageConfigs, getCategoryPageBySlug, getCategoryPageHref } from '@/lib/category-pages';
import { buildBreadcrumbJsonLd, buildPageMetadata, siteConfig } from '@/lib/seo';
import { safeJsonLd } from '@/lib/safe-json';
import { listProducts } from '@/server/products';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return categoryPageConfigs.map((config) => ({ slug: config.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const config = getCategoryPageBySlug(slug);
  if (!config) {
    return buildPageMetadata({
      title: 'Category Not Found',
      description: 'This jewelry category is not available.',
      path: '/shop',
      robots: { index: false, follow: false },
    });
  }

  return buildPageMetadata({
    title: config.seoTitle,
    description: config.description,
    path: getCategoryPageHref(config.slug),
    keywords: [
      config.fullLabel,
      'Gridaan',
      'fashion jewelry',
      'affordable Indian fashion jewelry',
      'premium-look jewelry',
    ],
  });
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const config = getCategoryPageBySlug(slug);

  if (!config) {
    notFound();
  }

  const { products } = await listProducts({
    category: config.filterSlug,
    limit: 24,
  });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: siteConfig.url },
    { name: 'Shop', url: `${siteConfig.url}/shop` },
    { name: config.fullLabel, url: `${siteConfig.url}${getCategoryPageHref(config.slug)}` },
  ]);

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-warm-50 py-12 md:py-16">
        <div className="container max-w-5xl">
          <nav className="mb-5 flex items-center gap-2 text-xs text-neutral-400">
            <Link href="/" className="hover:text-neutral-600">
              Home
            </Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-neutral-600">
              Shop
            </Link>
            <span>/</span>
            <span className="text-neutral-600">{config.fullLabel}</span>
          </nav>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 mb-3">Category</p>
          <h1 className="heading-display text-3xl md:text-5xl text-neutral-900 mb-4">{config.heading}</h1>
          <p className="max-w-3xl text-sm md:text-base text-neutral-600 leading-7">{config.description}</p>
          <p className="max-w-3xl text-sm md:text-base text-neutral-500 leading-7 mt-4">{config.intro}</p>
        </div>
      </section>

      <section className="container py-10 md:py-14">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-neutral-900">Featured picks</h2>
            <p className="text-sm text-neutral-500 mt-1">
              Browse Gridaan&apos;s latest {config.fullLabel.toLowerCase()} with a premium look and affordable pricing.
            </p>
          </div>
          <Link href={`/shop?category=${config.filterSlug}`} className="hidden md:inline-flex btn-outline text-sm">
            View filtered shop
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-3xl border border-neutral-100 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-neutral-900 mb-2">Fresh styles are on the way</p>
            <p className="text-sm text-neutral-500 mb-5">
              We are updating this category with new premium-look jewelry picks. Explore the full shop in the meantime.
            </p>
            <Link href="/shop" className="btn-primary text-sm">
              Shop all jewelry
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} priority={index < 4} />
            ))}
          </div>
        )}
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
    </div>
  );
}
