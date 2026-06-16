import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, Truck, Shield, RotateCcw } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { getFeaturedProducts, listProducts } from '@/server/products';
import { getActiveCategories } from '@/server/categories';
import type { Product } from '@/types';

export const revalidate = 300;

export default async function HomePage() {
  const [trending, newArrivals, bestSellers, categories] = await Promise.all([
    getFeaturedProducts('is_trending', 4),
    getFeaturedProducts('is_new_arrival', 4),
    getFeaturedProducts('is_best_seller', 4),
    getActiveCategories(),
  ]);

  const { products: koreanReal } = await listProducts({
    category: 'korean-jewelry',
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
                Elegance in
                <br />
                Every <span className="heading-italic text-gold-500">Detail</span>
              </h1>

              <p className="text-neutral-500 text-base md:text-lg max-w-md mx-auto lg:mx-0 mb-8 leading-relaxed">
                Discover handcrafted fashion jewelry that tells your story. From bridal sets to everyday
                elegance &mdash; affordable luxury awaits.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link href="/shop" className="btn-primary px-10 py-4 text-base group">
                  Shop Collection
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/shop?category=bridal-sets" className="btn-outline px-10 py-4 text-base">
                  Bridal Sets
                </Link>
              </div>

              <div className="flex items-center justify-center lg:justify-start gap-8 mt-12">
                {[
                  { num: '10K+', label: 'Happy Customers' },
                  { num: '500+', label: 'Products' },
                  { num: '4.8★', label: 'Average Rating' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-xl md:text-2xl font-bold text-neutral-900">{stat.num}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="relative w-full aspect-[3/4] max-w-lg mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-gold-200/30 to-gold-100/20 rounded-[3rem] rotate-6" />
                <Image
                  src="/hero.svg"
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
              { icon: Truck, title: 'Free Shipping', desc: 'On orders ₹999+' },
              { icon: Shield, title: 'Secure Payment', desc: 'Razorpay & COD' },
              { icon: RotateCcw, title: 'Easy Returns', desc: '7-day return policy' },
              { icon: Sparkles, title: 'Premium Quality', desc: 'Certified jewelry' },
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
      <section className="py-16 md:py-24 bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-gold-600 uppercase tracking-[0.2em] mb-3">Browse By</p>
            <h2 className="heading-display text-3xl md:text-4xl text-neutral-900">
              Our <span className="heading-italic text-gold-500">Categories</span>
            </h2>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible md:pb-0">
            {categories.slice(0, 10).map((cat) => (
              <Link
                key={cat.id}
                href={`/shop?category=${cat.slug}`}
                className="snap-center flex-shrink-0 w-36 md:w-auto group"
                prefetch
              >
                <div className="aspect-square rounded-2xl overflow-hidden bg-neutral-100 mb-3 relative">
                  {cat.image_url ? (
                    <Image
                      src={cat.image_url}
                      alt={cat.name}
                      fill
                      sizes="(max-width: 768px) 144px, 200px"
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-gold-50">
                      {cat.icon}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  {cat.icon && (
                    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-2xl">{cat.icon}</span>
                  )}
                </div>
                <p className="text-sm font-medium text-neutral-700 group-hover:text-gold-600 transition-colors text-center">
                  {cat.name}
                </p>
              </Link>
            ))}
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

      {/* BRIDAL BANNER */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-neutral-900 to-neutral-800 min-h-[400px] md:min-h-[500px] flex items-center">
            <div className="absolute inset-0">
              <Image
                src="/bridal-banner.svg"
                alt="Bridal collection"
                fill
                sizes="100vw"
                className="object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/90 via-neutral-900/70 to-transparent" />
            </div>
            <div className="relative z-10 p-8 md:p-16 max-w-xl">
              <p className="text-gold-400 text-xs font-semibold uppercase tracking-[0.3em] mb-4">
                Bridal Collection
              </p>
              <h2 className="heading-display text-3xl md:text-5xl text-white mb-4">
                Your Perfect <span className="heading-italic text-gold-400">Bridal</span> Look
              </h2>
              <p className="text-neutral-300 text-sm md:text-base mb-8 leading-relaxed">
                Make your special day unforgettable with our stunning bridal jewelry sets. Traditional,
                contemporary, and everything in between.
              </p>
              <Link href="/shop?category=bridal-sets" className="btn-gold">
                Explore Bridal Sets
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

      {/* KOREAN */}
      <section className="py-16 md:py-24 bg-warm-50">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden">
              <Image
                src="/korean.svg"
                alt="Korean jewelry collection"
                width={800}
                height={1000}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="md:pl-8">
              <p className="text-gold-600 text-xs font-semibold uppercase tracking-[0.3em] mb-4">
                Korean Style
              </p>
              <h2 className="heading-display text-3xl md:text-5xl text-neutral-900 mb-6">
                Minimalist <span className="heading-italic text-gold-500">Korean</span> Jewelry
              </h2>
              <p className="text-neutral-500 leading-relaxed mb-8">
                Embrace the K-beauty trend with our curated collection of minimalist, dainty jewelry pieces.
                Perfect for everyday elegance and subtle sophistication.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {koreanReal.length > 0 ? (
                  koreanReal.map((p) => (
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
                  <p className="text-sm text-neutral-400">Check back soon!</p>
                )}
              </div>
              <Link href="/shop?category=korean-jewelry" className="btn-primary">
                Shop Korean Collection
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
                Limited Time Offer
              </p>
              <h2 className="heading-display text-3xl md:text-5xl text-white mb-4">
                Festival Sale &mdash; Up to 50% Off
              </h2>
              <p className="text-white/80 max-w-lg mx-auto mb-8">
                Use code <span className="font-bold text-white">FESTIVE20</span> for an extra 20% off on your
                first order.
              </p>
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-10 py-4 text-sm font-semibold text-gold-700 hover:shadow-lg transition-all active:scale-[0.98]"
              >
                Shop Now
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
    <section className={`py-16 md:py-24 ${bg === 'white' ? 'bg-white' : 'bg-warm-50'}`}>
      <div className="container">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-xs font-semibold text-gold-600 uppercase tracking-[0.2em] mb-3">{eyebrow}</p>
            <h2 className="heading-display text-3xl md:text-4xl text-neutral-900">{title}</h2>
          </div>
          <Link
            href={cta.href}
            className="hidden md:flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-gold-600 transition-colors group"
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
