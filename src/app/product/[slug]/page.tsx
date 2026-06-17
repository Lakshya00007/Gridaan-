import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import ProductPageClient from './_client';
import { getProductBySlug, getRelatedProducts } from '@/server/products';
import { safeJsonLd, stripHtml } from '@/lib/safe-json';
import { buildBreadcrumbJsonLd, buildPageMetadata, siteConfig, toAbsoluteAssetUrl } from '@/lib/seo';
import { getCategoryPageByFilterSlug, getCategoryPageHref } from '@/lib/category-pages';
import { truncate, formatRupees } from '@/lib/utils';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return buildPageMetadata({
      title: 'Product Not Found',
      description: 'This product is not available.',
      path: '/shop',
      robots: { index: false, follow: false },
    });
  }
  const plainDescription = stripHtml(product.description);
  const primaryImage = product.images?.[0] ? toAbsoluteAssetUrl(product.images[0]) : undefined;

  return buildPageMetadata({
    title: product.name,
    description: truncate(plainDescription, 160),
    path: `/product/${product.slug}`,
    openGraphImage: primaryImage,
    keywords: [
      product.name,
      product.category?.name ?? '',
      'Gridaan',
      'fashion jewellery',
      'affordable Indian fashion jewellery',
    ].filter(Boolean),
  });
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const related = await getRelatedProducts(product, 4);
  const plainDescription = stripHtml(product.description);
  const categoryPage = product.category?.slug ? getCategoryPageByFilterSlug(product.category.slug) : null;
  const productImages = (product.images ?? []).map((image) => toAbsoluteAssetUrl(image));
  const schemaImages = productImages.length > 0 ? productImages : [siteConfig.icon];
  const productUrl = `${siteConfig.url}/product/${product.slug}`;
  const productSku = typeof product.metadata?.sku === 'string' ? product.metadata.sku : undefined;

  const ldJson: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: truncate(plainDescription, 500),
    image: schemaImages,
    brand: { '@type': 'Brand', name: siteConfig.name },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'INR',
      price: String(product.price),
      availability:
        product.in_stock && product.stock_count > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: siteConfig.name },
    },
  };
  if (productSku) {
    ldJson.sku = productSku;
  }

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: siteConfig.url },
    { name: 'Shop', url: `${siteConfig.url}/shop` },
    ...(categoryPage
      ? [{ name: categoryPage.fullLabel, url: `${siteConfig.url}${getCategoryPageHref(categoryPage.slug)}` }]
      : []),
    { name: product.name, url: productUrl },
  ]);

  return (
    <div className="min-h-screen bg-white">
      <div className="container py-4 text-xs text-neutral-400 flex items-center gap-2">
        <Link href="/" className="hover:text-neutral-600">Home</Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-neutral-600">Shop</Link>
        <span>/</span>
        {product.category && (
          <>
            <Link
              href={categoryPage ? getCategoryPageHref(categoryPage.slug) : `/shop?category=${product.category.slug}`}
              className="hover:text-neutral-600 capitalize"
            >
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-neutral-600 truncate">{product.name}</span>
      </div>

      <ProductPageClient product={product} />

      {/* Related */}
      {related.length > 0 && (
        <section className="container py-16">
          <h2 className="heading-display text-2xl md:text-3xl text-neutral-900 mb-8">
            You May Also <span className="heading-italic text-gold-500">Love</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {related.map((p) => (
              <Link key={p.id} href={`/product/${p.slug}`} className="group">
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 mb-3">
                  <Image
                    src={p.images?.[0] || '/placeholder.svg'}
                    alt={p.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-sm font-bold text-gold-600">
                  {formatRupees(p.price)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(ldJson) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
    </div>
  );
}
