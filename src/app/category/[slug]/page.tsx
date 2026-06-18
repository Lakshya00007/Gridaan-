import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
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
  const categoryGroup = config.slug.startsWith('men-') ? 'men-' : 'women-';
  const relatedCategories = categoryPageConfigs
    .filter((category) => category.slug.startsWith(categoryGroup) && category.slug !== config.slug)
    .slice(0, 4);
  const hasProducts = products.length > 0;

  return (
    <div className="min-h-screen bg-[#fcfaf7]">
      <section className="border-b border-stone-200/70 bg-gradient-to-r from-[#fbf6ef] via-[#fffdf9] to-[#f5eadc]">
        <div className="container max-w-6xl py-7 md:py-10">
          <nav className="mb-5 flex items-center gap-2 text-xs text-neutral-400">
            <Link href="/" className="transition-colors hover:text-neutral-700">
              Home
            </Link>
            <span>/</span>
            <Link href="/shop" className="transition-colors hover:text-neutral-700">
              Shop
            </Link>
            <span>/</span>
            <span className="text-neutral-600">{config.fullLabel}</span>
          </nav>

          <div className="grid gap-7 lg:grid-cols-[1fr_0.92fr] lg:items-center">
            <div className="py-1 md:py-3">
              <div className="flex items-center gap-3 text-xs text-neutral-500">
                <span className="font-semibold text-gold-700">Gridaan edit</span>
                <span className="h-px w-8 bg-gold-300" />
                <span>
                  {products.length} {products.length === 1 ? 'style' : 'styles'}
                </span>
              </div>
              <h1 className="heading-display mt-4 text-4xl text-neutral-950 md:text-5xl">{config.heading}</h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-600 md:text-base md:leading-7">
                {config.description}
              </p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500">{config.intro}</p>

              {config.highlights?.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {config.highlights.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-stone-200/90 bg-white/75 px-3 py-1.5 text-xs text-neutral-600"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                {hasProducts ? (
                  <Link href={`/shop?category=${config.filterSlug}`} className="btn-primary px-6 py-2.5 text-sm">
                    Shop this category
                  </Link>
                ) : null}
                <Link href="/shop" className={hasProducts ? 'btn-outline px-6 py-2.5 text-sm' : 'btn-primary px-6 py-2.5 text-sm'}>
                  Explore all jewellery
                </Link>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border border-white/80 bg-stone-100 shadow-[0_22px_48px_-34px_rgba(53,38,18,0.35)]">
              <div className="relative aspect-[16/10] lg:aspect-[5/4]">
                <Image
                  src={config.imagePath}
                  alt={config.fullLabel}
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container max-w-7xl py-9 md:py-12">
          {hasProducts ? (
            <>
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-gold-700">The collection</p>
                  <h2 className="heading-display mt-1 text-2xl text-neutral-950 md:text-3xl">
                    Explore {config.shortLabel}
                  </h2>
                </div>
                <Link
                  href={`/shop?category=${config.filterSlug}`}
                  className="hidden items-center gap-2 text-sm font-medium text-neutral-600 transition-colors hover:text-gold-800 md:inline-flex"
                >
                  View filtered shop
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} priority={index < 4} />
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-9">
              <div className="flex flex-col gap-5 border-b border-stone-200/80 pb-8 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="heading-display text-2xl text-neutral-950">Fresh styles coming soon</p>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                    New styles are being added soon. Explore the wider Gridaan collection while this edit is being prepared.
                  </p>
                </div>
                <Link href="/shop" className="btn-primary shrink-0 px-6 py-2.5 text-sm">
                  Explore all jewellery
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div>
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gold-700">Continue exploring</p>
                  <h2 className="heading-display mt-1 text-2xl text-neutral-950">Related categories</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {relatedCategories.map((category) => (
                    <Link
                      key={category.slug}
                      href={getCategoryPageHref(category.slug)}
                      className="group"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-stone-100">
                        <Image
                          src={category.imagePath}
                          alt={category.fullLabel}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                        <p className="absolute inset-x-0 bottom-0 p-3 text-sm font-semibold text-white md:p-4">
                          {category.shortLabel}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
    </div>
  );
}
