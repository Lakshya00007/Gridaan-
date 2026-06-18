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
    <div className="min-h-screen bg-[#fcfaf7]">
      <section className="border-b border-stone-200/70 bg-gradient-to-r from-[#fbf6ef] via-[#fffdf9] to-[#f5eadc]">
        <div className="container py-8 md:py-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 text-xs text-neutral-500">
                <span className="font-semibold text-gold-700">{heroEyebrow}</span>
                <span className="h-px w-8 bg-gold-300" />
                <span>{count} {count === 1 ? 'product' : 'products'}</span>
              </div>
              <h1 className="heading-display mt-4 text-4xl text-neutral-950 md:text-5xl">
                {heroTitle}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-600 md:text-base md:leading-7">
                {heroDescription}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
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
                        'rounded-full border px-3.5 py-2 text-xs font-medium transition-colors',
                        category === slug
                          ? 'border-neutral-950 bg-neutral-950 text-white'
                          : 'border-stone-200 bg-white/75 text-neutral-600 hover:border-gold-300 hover:text-neutral-950'
                      )}
                    >
                      {config.shortLabel}
                    </button>
                  );
                })}
              </div>

              {category !== 'all' || q ? (
                <button
                  onClick={() => {
                    update({ category: null, q: null });
                    setSearchQuery('');
                  }}
                  className="mt-4 text-sm font-medium text-neutral-500 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-neutral-950"
                >
                  Clear selection
                </button>
              ) : null}
            </div>

            <div className="hidden md:block">
              <div className="grid h-[18rem] grid-cols-[1.18fr_0.82fr] gap-3">
                <div className="group relative overflow-hidden rounded-3xl bg-stone-100 shadow-[0_20px_45px_-32px_rgba(53,38,18,0.35)]">
                  <div className="relative h-full">
                    <Image
                      src={heroCards[0]?.image ?? '/placeholder.svg'}
                      alt={heroCards[0]?.label ?? 'Featured jewellery'}
                      fill
                      sizes="(max-width: 1024px) 50vw, 30vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="text-xs font-medium text-white/80">Curated edit</p>
                      <p className="heading-display mt-1 text-2xl text-white">{heroCards[0]?.label}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-rows-2 gap-3">
                  {heroCards.slice(1, 3).map((card) => (
                    <div
                      key={card.slug}
                      className="group relative overflow-hidden rounded-2xl bg-stone-100 shadow-[0_20px_45px_-34px_rgba(53,38,18,0.3)]"
                    >
                      <div className="relative h-full">
                        <Image
                          src={card.image}
                          alt={card.label}
                          fill
                          sizes="(max-width: 1024px) 50vw, 20vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-4">
                          <p className="text-sm font-semibold text-white">{card.label}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container py-6 md:py-8">
        <div className="mb-6 border-b border-stone-200/80 pb-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="hidden md:flex overflow-x-auto no-scrollbar gap-2">
              <button
                onClick={() => update({ category: null })}
                className={cn(
                  'whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition-colors',
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
                    'whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition-colors',
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
                className="appearance-none cursor-pointer rounded-full border border-stone-200 bg-white px-4 py-2.5 pr-10 text-xs font-medium text-neutral-600 outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-100"
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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-2xl bg-gradient-to-br from-stone-100 to-stone-50" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        ) : (
          <div className="border-b border-stone-200/80 py-10 text-center">
            <h3 className="heading-display text-2xl text-neutral-950">
              {currentCategory ? 'Fresh styles coming soon' : 'No products found'}
            </h3>
            <p className="mx-auto mb-6 mt-2 max-w-md text-sm leading-6 text-neutral-500">
              {currentCategory
                ? 'New styles are being added to this category. Explore all jewellery in the meantime.'
                : 'Try adjusting your filters or search query.'}
            </p>
            <button
              onClick={() => {
                update({ category: null, sort: null, q: null, max: null });
                setSearchQuery('');
              }}
              className="btn-primary px-6 py-2.5 text-sm"
            >
              Explore all jewellery
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
