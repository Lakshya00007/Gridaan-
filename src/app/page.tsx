import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, Truck, Shield, RotateCcw } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { getFeaturedProducts, listProducts } from '@/server/products';
import { getActiveCategories } from '@/server/categories';
import type { Product } from '@/types';
import { getCategoryPageByFilterSlug, getCategoryPageHref } from '@/lib/category-pages';
import { cn } from '@/lib/utils';

export const revalidate = 300;

export default async function HomePage() {
  const [trending, newArrivals, bestSellers, categories] = await Promise.all([
    getFeaturedProducts('is_trending', 4),
    getFeaturedProducts('is_new_arrival', 4),
    getFeaturedProducts('is_best_seller', 4),
    getActiveCategories(),
  ]);

  const { products: featuredSets } = await listProducts({
    category: 'women-full-sets',
    limit: 2,
  });

  return (
    <>
      {/* HERO */}
      <section className="relative flex min-h-[74vh] items-center overflow-hidden bg-gradient-to-br from-cream-50 via-white to-gold-50 md:min-h-[80vh]">
        <div className="container relative z-10 py-14 md:py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-gold-100/60 px-4 py-2">
                <Sparkles className="w-4 h-4 text-gold-600" />
                <span className="text-xs font-semibold text-gold-700 uppercase tracking-wider">
                  New Collection {new Date().getFullYear()}
                </span>
              </div>

              <h1 className="heading-display mb-5 text-4xl text-neutral-900 sm:text-5xl md:text-6xl lg:text-7xl">
                Affordable Indian
                <br />
                <span className="heading-italic text-gold-500">Fashion Jewellery</span>
              </h1>

              <p className="mx-auto mb-7 max-w-md text-base leading-relaxed text-neutral-500 md:text-lg lg:mx-0">
                Artificial and imitation earrings, necklace sets &amp; festive fashion jewellery starting ₹99.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link
                  href={getCategoryPageHref('women-earrings')}
                  className="btn-primary px-10 py-4 text-base group"
                >
                  Shop Women Earrings
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href={getCategoryPageHref('women-full-sets')} className="btn-outline px-10 py-4 text-base">
                  Explore Full Jewellery Sets
                </Link>
              </div>

              <div className="mt-10 flex items-center justify-center gap-6 lg:justify-start">
                {[
                  { title: 'COD Available', detail: 'Easy checkout across India' },
                  { title: 'Premium Look', detail: 'Festive styles that feel elevated' },
                  { title: 'Affordable Prices', detail: 'Launch picks starting at ₹99' },
                ].map((stat) => (
                  <div key={stat.title} className="text-center max-w-[8.5rem]">
                    <p className="text-sm md:text-base font-semibold text-neutral-900">{stat.title}</p>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{stat.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="relative w-full aspect-[3/4] max-w-lg mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-gold-200/30 to-gold-100/20 rounded-[3rem] rotate-6" />
                <Image
                  src="/hero-jewelry.webp"
                  alt="Premium-look artificial fashion jewellery collection"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="relative rounded-[2.5rem] shadow-2xl object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BADGES */}
      <section className="py-6 border-y border-neutral-100 bg-white">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { icon: Truck, title: 'COD Available', desc: 'Easy shopping across India' },
              { icon: Shield, title: 'Premium Look', desc: 'Polished festive-ready styles' },
              { icon: RotateCcw, title: 'Affordable Prices', desc: 'Statement pieces from ₹99' },
              { icon: Sparkles, title: 'Launch Picks', desc: 'Earrings, sets, combos & more' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3 justify-center">
                <div className="w-10 h-10 rounded-full bg-gold-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-gold-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{title}</p>
                  <p className="text-xs text-neutral-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="bg-gradient-to-b from-white via-[#fdfaf6] to-[#faf4ec] py-12 md:py-16">
        <div className="container">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-gold-700">Browse by category</p>
              <h2 className="heading-display text-3xl md:text-4xl text-neutral-900">
                Women &amp; Men <span className="heading-italic text-gold-500">Categories</span>
              </h2>
            </div>
            <Link href="/shop" className="hidden items-center gap-2 text-sm font-medium text-neutral-600 transition-colors hover:text-gold-800 md:inline-flex">
              Shop all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-4 md:overflow-visible md:pb-0 xl:grid-cols-5">
            {categories.map((cat) => {
              const categoryPage = getCategoryPageByFilterSlug(cat.slug);
              const categoryImage = cat.image_url ?? categoryPage?.imagePath ?? null;
              const categoryLabel = categoryPage?.shortLabel ?? cat.name;

              return (
                <Link
                  key={cat.id}
                  href={categoryPage ? getCategoryPageHref(categoryPage.slug) : `/shop?category=${cat.slug}`}
                  className="group w-40 flex-shrink-0 snap-center md:w-auto"
                  prefetch
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-stone-200/70 bg-gradient-to-br from-stone-100 via-cream-50 to-stone-200 shadow-[0_18px_38px_-30px_rgba(53,38,18,0.3)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-gold-300 group-hover:shadow-[0_22px_42px_-28px_rgba(53,38,18,0.38)]">
                    {categoryImage ? (
                      <Image
                        src={categoryImage}
                        alt={categoryLabel}
                        fill
                        sizes="(max-width: 768px) 144px, 200px"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-stone-100 via-cream-50 to-stone-200" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                      <p className="text-sm font-semibold leading-5 text-white">{categoryLabel}</p>
                      <ArrowRight className="h-4 w-4 shrink-0 text-white/85 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* TRENDING */}
      <Section
        eyebrow="Hot Right Now"
        title={
          <>
            Trending <span className="heading-italic text-gold-500">Products</span>
          </>
        }
        products={trending}
        cta={{ href: '/shop?sort=trending', label: 'View All' }}
        bg="warm"
      />

      {/* WEDDING GUEST EDIT */}
      <section className="bg-white py-12 md:py-16">
        <div className="container">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-neutral-900 to-neutral-800 min-h-[400px] md:min-h-[500px] flex items-center">
            <div className="absolute inset-0">
              <Image
                src="/wedding-guest-banner.webp"
                alt="Wedding guest fashion jewellery edit"
                fill
                sizes="100vw"
                className="object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/90 via-neutral-900/70 to-transparent" />
            </div>
            <div className="relative z-10 p-8 md:p-16 max-w-xl">
              <p className="mb-3 text-xs font-semibold text-gold-400">
                Wedding Guest Edit
              </p>
              <h2 className="heading-display text-3xl md:text-5xl text-white mb-4">
                Dress Up Your <span className="heading-italic text-gold-400">Wedding Guest</span> Look
              </h2>
              <p className="text-neutral-300 text-sm md:text-base mb-8 leading-relaxed">
                Find statement earrings, necklace sets, and festive add-ons that instantly elevate your
                saree, suit, or dress for every celebration invite.
              </p>
              <Link href={getCategoryPageHref('women-hair-jewellery')} className="btn-gold">
                Shop Hair Jewellery
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <Section
        eyebrow="Fresh Drops"
        title={
          <>
            New <span className="heading-italic text-gold-500">Arrivals</span>
          </>
        }
        products={newArrivals}
        cta={{ href: '/shop?sort=newest', label: 'View All' }}
        bg="white"
      />

      {/* FULL JEWELLERY SETS */}
      <section className="bg-warm-50 py-12 md:py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden">
              <Image
                src="/combo-pack-banner.webp"
                alt="Full jewellery sets collection"
                width={800}
                height={1000}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="md:pl-8">
              <p className="mb-3 text-xs font-semibold text-gold-700">
                Full Jewellery Sets
              </p>
              <h2 className="heading-display text-3xl md:text-5xl text-neutral-900 mb-6">
                Coordinated styles, <span className="heading-italic text-gold-500">one easy pick</span>
              </h2>
              <p className="text-neutral-500 leading-relaxed mb-8">
                Explore necklace-and-earring pairings, festive combos, and full-set looks that make
                gifting and occasion styling feel polished without the guesswork.
              </p>
              {featuredSets.length > 0 ? (
                <div className="mb-8 grid grid-cols-2 gap-4">
                  {featuredSets.map((p) => (
                    <Link key={p.id} href={`/product/${p.slug}`} className="text-left group" prefetch>
                      <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 mb-2">
                        <Image
                          src={p.images?.[0] || '/placeholder.svg'}
                          alt={p.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-sm font-bold text-gold-600">₹{p.price.toLocaleString('en-IN')}</p>
                    </Link>
                  ))}
                </div>
              ) : null}
              <Link href={getCategoryPageHref('women-full-sets')} className="btn-primary">
                Shop Full Jewellery Sets
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* BEST SELLERS */}
      <Section
        eyebrow="Customer Favorites"
        title={
          <>
            Best <span className="heading-italic text-gold-500">Sellers</span>
          </>
        }
        products={bestSellers}
        cta={{ href: '/shop?sort=trending', label: 'View All' }}
        bg="white"
      />

      {/* FESTIVAL SALE */}
      <section className="bg-gradient-to-b from-gold-50 to-white py-12 md:py-16">
        <div className="container">
          <div className="relative rounded-3xl bg-gradient-to-r from-gold-500 via-gold-400 to-gold-500 p-8 md:p-16 text-center overflow-hidden">
            <div className="relative z-10">
              <p className="mb-3 text-xs font-semibold text-white/80">
                Launch Offer
              </p>
              <h2 className="heading-display text-3xl md:text-5xl text-white mb-4">
                Festive fashion jewellery that looks premium, priced for repeat wear
              </h2>
              <p className="text-white/80 max-w-lg mx-auto mb-8">
                Explore women earrings, jewellery sets, and everyday gifting picks without stretching your
                budget.
              </p>
              <Link
                href={getCategoryPageHref('women-earrings')}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-10 py-4 text-sm font-semibold text-gold-700 hover:shadow-lg transition-all active:scale-[0.98]"
              >
                Shop Women Earrings
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Section({
  eyebrow,
  title,
  products,
  cta,
  bg = 'white',
}: {
  eyebrow: string;
  title: React.ReactNode;
  products: Product[];
  cta: { href: string; label: string };
  bg?: 'white' | 'warm';
}) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        'relative overflow-hidden py-12 md:py-16',
        bg === 'white' ? 'bg-white' : 'bg-gradient-to-b from-[#fdf9f4] to-[#f7efe5]'
      )}
    >
      <div className="container relative">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-gold-700">{eyebrow}</p>
            <h2 className="heading-display text-3xl md:text-4xl text-neutral-900">{title}</h2>
          </div>
          <Link
            href={cta.href}
            className="hidden md:flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 px-5 py-3 text-sm font-medium text-neutral-600 transition-all hover:border-gold-300 hover:text-gold-700 hover:shadow-sm group"
          >
            {cta.label}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
        <div className="md:hidden text-center mt-8">
          <Link href={cta.href} className="btn-outline text-sm">
            {cta.label} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
