import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import ProductCard from '@/components/ProductCard';
import { categoryPageConfigs, getCategoryPageBySlug, getCategoryPageHref } from '@/lib/category-pages';
import { absoluteUrl, buildBreadcrumbJsonLd, buildPageMetadata, siteConfig } from '@/lib/seo';
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
    openGraphImage: absoluteUrl(config.imagePath),
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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#fbf7f1] via-white to-[#f7ebdc] py-12 md:py-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 top-8 h-56 w-56 rounded-full bg-gold-100/45 blur-3xl" />
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#f0dac0]/45 blur-3xl" />
          <div className="absolute bottom-8 left-1/3 h-40 w-40 rounded-full bg-white/70 blur-2xl" />
        </div>
        <div className="container relative max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div className="rounded-[2rem] border border-stone-200/80 bg-white/85 p-6 shadow-[0_26px_65px_-46px_rgba(53,38,18,0.45)] backdrop-blur-sm md:p-8">
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
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex rounded-full border border-gold-200 bg-gold-50/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-700">
                  Category Edit
                </span>
                <span className="inline-flex rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-700">
                  {products.length} {products.length === 1 ? 'style' : 'styles'}
                </span>
              </div>
              <h1 className="heading-display mt-6 text-3xl md:text-5xl text-neutral-900 mb-4">{config.heading}</h1>
              <p className="max-w-3xl text-sm md:text-base text-neutral-600 leading-7">{config.description}</p>
              <p className="max-w-3xl text-sm md:text-base text-neutral-500 leading-7 mt-4">{config.intro}</p>
              {config.highlights?.length ? (
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {config.highlights.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-stone-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600 shadow-[0_16px_32px_-30px_rgba(53,38,18,0.35)]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href={`/shop?category=${config.filterSlug}`} className="btn-primary text-sm">
                  Shop this category
                </Link>
                <Link href="/shop" className="btn-outline text-sm">
                  Browse all jewelry
                </Link>
              </div>
            </div>
            <div className="group relative rounded-[2rem] border border-white/70 bg-white/80 p-3 shadow-[0_26px_65px_-46px_rgba(53,38,18,0.45)] backdrop-blur-sm">
              <div className="relative aspect-[5/4] overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-stone-100 via-cream-50 to-stone-200 ring-1 ring-black/5">
                <Image
                  src={config.imagePath}
                  alt={config.fullLabel}
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 rounded-full bg-white/88 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-800 backdrop-blur-sm">
                  {config.shortLabel}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-white to-[#fcfaf7]">
        <div className="container py-10 md:py-14">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
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
            <div className="rounded-[2rem] border border-stone-200/80 bg-gradient-to-br from-white to-[#faf6f1] p-10 text-center shadow-[0_24px_60px_-42px_rgba(53,38,18,0.35)]">
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
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
    </div>
  );
}
