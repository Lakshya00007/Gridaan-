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
      <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-center bg-gradient-to-br from-cream-50 via-white to-gold-50 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-gold-100/40 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-80 h-80 bg-gold-200/30 rounded-full blur-3xl" />
        </div>
        <div className="container py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold-100/60 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-gold-600" />
                <span className="text-xs font-semibold text-gold-700 uppercase tracking-wider">
                  New Collection {new Date().getFullYear()}
                </span>
              </div>

              <h1 className="heading-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-neutral-900 mb-6">
                Affordable Indian
                <br />
                <span className="heading-italic text-gold-500">Fashion Jewelry</span>
              </h1>

              <p className="text-neutral-500 text-base md:text-lg max-w-md mx-auto lg:mx-0 mb-8 leading-relaxed">
                Premium-look earrings, necklace sets &amp; festive jewelry starting ₹99.
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

              <div className="flex items-center justify-center lg:justify-start gap-8 mt-12">
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
                  alt="Premium jewelry collection"
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
      <section className="py-16 md:py-24 bg-gradient-to-b from-white via-[#fdfaf6] to-[#faf4ec]">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-gold-600 uppercase tracking-[0.2em] mb-3">Browse By</p>
            <h2 className="heading-display text-3xl md:text-4xl text-neutral-900">
              Women &amp; Men <span className="heading-italic text-gold-500">Categories</span>
            </h2>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar snap-x snap-mandatory md:grid md:grid-cols-4 xl:grid-cols-5 md:overflow-visible md:pb-0">
            {categories.map((cat) => {
              const categoryPage = getCategoryPageByFilterSlug(cat.slug);
              const categoryImage = cat.image_url ?? categoryPage?.imagePath ?? null;
              const categoryLabel = categoryPage?.shortLabel ?? cat.name;

              return (
                <Link
                  key={cat.id}
                  href={categoryPage ? getCategoryPageHref(categoryPage.slug) : `/shop?category=${cat.slug}`}
                  className="snap-center flex-shrink-0 w-40 md:w-auto group"
                  prefetch
                >
                  <div className="overflow-hidden rounded-[1.9rem] border border-stone-200/80 bg-white/85 p-3 shadow-[0_22px_56px_-44px_rgba(53,38,18,0.4)] transition-all duration-300 group-hover:-translate-y-1 group-hover:border-gold-300 group-hover:shadow-[0_26px_66px_-42px_rgba(53,38,18,0.48)]">
                    <div className="relative aspect-square overflow-hidden rounded-[1.45rem] bg-gradient-to-br from-stone-100 via-cream-50 to-stone-200 ring-1 ring-black/5">
                    {categoryImage ? (
                      <Image
                        src={categoryImage}
                        alt={categoryLabel}
                        fill
                        sizes="(max-width: 768px) 144px, 200px"
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-stone-100 via-cream-50 to-stone-200" />
                    )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-transparent" />
                      <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/88 text-gold-700 shadow-sm backdrop-blur-sm transition-transform duration-300 group-hover:scale-105">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-3 px-1">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 group-hover:text-gold-700 transition-colors">
                        {categoryLabel}
                      </p>
                      <span className="mt-2 block h-px w-10 bg-gradient-to-r from-gold-500 to-transparent" />
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
      <section className="py-16 md:py-24 bg-white">
        <div className="container">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-neutral-900 to-neutral-800 min-h-[400px] md:min-h-[500px] flex items-center">
            <div className="absolute inset-0">
              <Image
                src="/wedding-guest-banner.webp"
                alt="Wedding guest jewelry edit"
                fill
                sizes="100vw"
                className="object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/90 via-neutral-900/70 to-transparent" />
            </div>
            <div className="relative z-10 p-8 md:p-16 max-w-xl">
              <p className="text-gold-400 text-xs font-semibold uppercase tracking-[0.3em] mb-4">
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
      <section className="py-16 md:py-24 bg-warm-50">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden">
              <Image
                src="/combo-pack-banner.webp"
                alt="Combo packs collection"
                width={800}
                height={1000}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="md:pl-8">
              <p className="text-gold-600 text-xs font-semibold uppercase tracking-[0.3em] mb-4">
                Full Jewellery Sets
              </p>
              <h2 className="heading-display text-3xl md:text-5xl text-neutral-900 mb-6">
                Coordinated styles, <span className="heading-italic text-gold-500">one easy pick</span>
              </h2>
              <p className="text-neutral-500 leading-relaxed mb-8">
                Explore necklace-and-earring pairings, festive combos, and full-set looks that make
                gifting and occasion styling feel polished without the guesswork.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {featuredSets.length > 0 ? (
                  featuredSets.map((p) => (
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
                  ))
                ) : (
                  <p className="text-sm text-neutral-400">Fresh jewellery sets are landing soon. Check back shortly.</p>
                )}
              </div>
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
      <section className="py-16 md:py-24 bg-gradient-to-b from-gold-50 to-white">
        <div className="container">
          <div className="relative rounded-3xl bg-gradient-to-r from-gold-500 via-gold-400 to-gold-500 p-8 md:p-16 text-center overflow-hidden">
            <div className="relative z-10">
              <p className="text-white/80 text-xs font-semibold uppercase tracking-[0.3em] mb-3">
                Launch Offer
              </p>
              <h2 className="heading-display text-3xl md:text-5xl text-white mb-4">
                Festive jewelry that looks premium, priced for repeat wear
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
  return (
    <section
      className={cn(
        'relative overflow-hidden py-16 md:py-24',
        bg === 'white' ? 'bg-white' : 'bg-gradient-to-b from-[#fdf9f4] to-[#f7efe5]'
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute right-8 top-6 h-28 w-28 rounded-full bg-gold-100/35 blur-3xl" />
      </div>
      <div className="container relative">
        <div className="mb-12 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gold-600 uppercase tracking-[0.2em] mb-3">{eyebrow}</p>
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
        {products.length === 0 ? (
          <p className="text-center text-neutral-400 py-12">No products yet — add some from the admin panel.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
        <div className="md:hidden text-center mt-8">
          <Link href={cta.href} className="btn-outline text-sm">
            {cta.label} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
