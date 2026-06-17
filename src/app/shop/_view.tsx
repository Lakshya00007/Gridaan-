'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '@/components/ProductCard';
import { useUI } from '@/store/ui';
import { cn } from '@/lib/utils';
import type { Category, Product } from '@/types';
import { getCategoryImagePath, getCategoryPageByFilterSlug } from '@/lib/category-pages';

type Sort = 'featured' | 'newest' | 'trending' | 'price_asc' | 'price_desc' | 'rating';

const shopHighlightSlugs = [
  'women-earrings',
  'women-necklaces',
  'women-full-sets',
  'men-chains',
  'men-bracelets',
] as const;

type ShopHighlightSlug = (typeof shopHighlightSlugs)[number];
type ShopHeroCard = {
  slug: ShopHighlightSlug;
  label: string;
  image: string;
};

export default function ShopView() {
  const sp = useSearchParams();
  const router = useRouter();
  const { searchQuery, setSearchQuery } = useUI();
  const [, startTransition] = useTransition();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const category = sp.get('category') || 'all';
  const sort = (sp.get('sort') as Sort) || 'featured';
  const q = sp.get('q') || searchQuery || '';
  const maxPrice = Number(sp.get('max') || 5000);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/products?' + sp.toString())
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        setProducts(data.products ?? []);
        setCount(data.count ?? 0);
        setCategories(data.categories ?? []);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [sp]);

  const currentCategory = categories.find((c) => c.slug === category);
  const currentCategoryPage = category !== 'all' ? getCategoryPageByFilterSlug(category) : null;
  const heroTitle = currentCategory ? currentCategory.name : q ? `Results for "${q}"` : 'All Jewellery';
  const heroDescription = currentCategoryPage?.description
    ?? currentCategory?.description
    ?? (q
      ? 'Explore the styles that match your search across women’s and men’s fashion jewellery.'
      : 'Explore women’s and men’s fashion jewellery made for daily wear, gifting, festive looks, and statement styling.');
  const heroEyebrow = currentCategory ? 'Category Edit' : q ? 'Search Results' : 'Shop Gridaan';
  const heroCards = shopHighlightSlugs.reduce<ShopHeroCard[]>((cards, slug) => {
      const config = getCategoryPageByFilterSlug(slug);
      if (config) {
        cards.push({
          slug,
          label: config.shortLabel,
          image: getCategoryImagePath(slug) ?? '/placeholder.svg',
        });
      }
      return cards;
    }, []);

  const filtered = useMemo(() => {
    let result = [...products];
    if (maxPrice) result = result.filter((p) => p.price <= maxPrice);
    return result;
  }, [products, maxPrice]);

  function update(updates: Record<string, string | null>) {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    startTransition(() => router.push(`/shop?${next.toString()}`));
  }

  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#fbf7f1] via-white to-[#f7ebdc] py-12 md:py-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-gold-100/50 blur-3xl" />
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#f0dac0]/45 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-white/70 blur-2xl" />
        </div>
        <div className="container relative">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full border border-gold-200 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-700 shadow-[0_18px_40px_-32px_rgba(74,44,18,0.45)]">
                {heroEyebrow}
              </span>
              <h1 className="heading-display mt-6 text-4xl md:text-5xl lg:text-6xl text-neutral-900">
                {heroTitle}
              </h1>
              <p className="mt-5 max-w-xl text-sm md:text-base leading-7 text-neutral-600">
                {heroDescription}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                {shopHighlightSlugs.map((slug) => {
                  const config = getCategoryPageByFilterSlug(slug);
                  if (!config) {
                    return null;
                  }

                  return (
                    <button
                      key={slug}
                      onClick={() => update({ category: slug, q: null })}
                      className={cn(
                        'rounded-full border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300',
                        category === slug
                          ? 'border-neutral-900 bg-neutral-900 text-white shadow-[0_18px_36px_-28px_rgba(20,20,20,0.55)]'
                          : 'border-stone-200 bg-white/80 text-neutral-700 hover:-translate-y-0.5 hover:border-gold-300 hover:text-neutral-900 hover:shadow-sm'
                      )}
                    >
                      {config.shortLabel}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-full border border-stone-200 bg-white/85 px-4 py-2 text-sm font-medium text-neutral-700 shadow-[0_18px_40px_-34px_rgba(53,38,18,0.35)]">
                  {count} {count === 1 ? 'product' : 'products'} found
                </div>
                {category !== 'all' || q ? (
                  <button
                    onClick={() => {
                      update({ category: null, q: null });
                      setSearchQuery('');
                    }}
                    className="inline-flex items-center rounded-full border border-transparent px-4 py-2 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
                  >
                    Clear selection
                  </button>
                ) : null}
              </div>
            </div>

            <div className="hidden md:block">
              <div className="grid grid-cols-[1.08fr_0.92fr] gap-4">
                <div className="group relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_24px_60px_-42px_rgba(53,38,18,0.45)]">
                  <div className="relative aspect-[4/5]">
                    <Image
                      src={heroCards[0]?.image ?? '/placeholder.svg'}
                      alt={heroCards[0]?.label ?? 'Featured jewellery'}
                      fill
                      sizes="(max-width: 1024px) 50vw, 30vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">Curated Edit</p>
                      <p className="mt-1 heading-display text-2xl text-white">{heroCards[0]?.label}</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4">
                  {heroCards.slice(1, 3).map((card) => (
                    <div
                      key={card.slug}
                      className="group relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/80 shadow-[0_24px_60px_-42px_rgba(53,38,18,0.45)]"
                    >
                      <div className="relative aspect-[4/3]">
                        <Image
                          src={card.image}
                          alt={card.label}
                          fill
                          sizes="(max-width: 1024px) 50vw, 20vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-4">
                          <p className="text-lg font-semibold text-white">{card.label}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-[1.75rem] border border-stone-200/80 bg-white/90 p-5 shadow-[0_24px_60px_-42px_rgba(53,38,18,0.32)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-600">Style Notes</p>
                    <p className="mt-3 text-sm leading-7 text-neutral-600">
                      Discover women’s and men’s jewellery with soft gold finishes, everyday-friendly silhouettes, and premium styling made for repeat wear.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container py-8">
        <div className="mb-8 rounded-[2rem] border border-stone-200/70 bg-gradient-to-br from-white to-[#faf6f1] p-4 shadow-[0_24px_60px_-42px_rgba(53,38,18,0.4)] md:p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="hidden md:flex overflow-x-auto no-scrollbar gap-2">
              <button
                onClick={() => update({ category: null })}
                className={cn(
                  'px-4 py-2.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.18em] transition-all whitespace-nowrap border',
                  category === 'all'
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-stone-200 bg-white/80 text-neutral-600 hover:border-gold-300 hover:text-neutral-900'
                )}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => update({ category: cat.slug })}
                  className={cn(
                    'px-4 py-2.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.18em] transition-all whitespace-nowrap border',
                    category === cat.slug
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-stone-200 bg-white/80 text-neutral-600 hover:border-gold-300 hover:text-neutral-900'
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <FilterButton onOpen={() => update({})} />

            <div className="relative ml-auto">
              <select
                value={sort}
                onChange={(e) => update({ sort: e.target.value })}
                className="appearance-none bg-white border border-stone-200 rounded-full px-4 py-2.5 pr-10 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-600 cursor-pointer focus:border-gold-400 focus:ring-1 focus:ring-gold-100 outline-none"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="trending">Trending</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square rounded-[1.75rem] bg-gradient-to-br from-stone-100 to-stone-50 animate-pulse" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-stone-200/70 bg-gradient-to-br from-white to-[#faf6f1] px-6 py-14 text-center shadow-[0_24px_60px_-42px_rgba(53,38,18,0.35)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-50 text-gold-600 shadow-inner">
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-neutral-900">No products found</h3>
            <p className="mt-2 text-sm text-neutral-500 mb-6">Try adjusting your filters or search query</p>
            <button
              onClick={() => {
                update({ category: null, sort: null, q: null, max: null });
                setSearchQuery('');
              }}
              className="btn-primary text-sm"
            >
              View All Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterButton({ onOpen: _onOpen }: { onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const sp = useSearchParams();
  const router = useRouter();
  const max = Number(sp.get('max') || 5000);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center gap-2 px-4 py-2.5 border border-neutral-200 rounded-full text-sm font-medium"
      >
        <SlidersHorizontal className="w-4 h-4" /> Filters
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 max-h-[80vh] bg-white z-50 rounded-t-3xl overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Filters</h3>
                  <button onClick={() => setOpen(false)} aria-label="Close filters">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="mb-6">
                  <p className="text-sm font-semibold mb-3">Max Price: ₹{max}</p>
                  <input
                    type="range"
                    min={100}
                    max={10000}
                    step={100}
                    value={max}
                    onChange={(e) => {
                      const next = new URLSearchParams(sp);
                      next.set('max', e.target.value);
                      router.replace(`/shop?${next.toString()}`, { scroll: false });
                    }}
                    className="w-full accent-gold-500"
                  />
                </div>
                <button onClick={() => setOpen(false)} className="w-full btn-primary py-3">
                  Show Results
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
