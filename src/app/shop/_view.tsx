'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '@/components/ProductCard';
import { useUI } from '@/store/ui';
import { cn } from '@/lib/utils';
import type { Category, Product } from '@/types';

type Sort = 'featured' | 'newest' | 'trending' | 'price_asc' | 'price_desc' | 'rating';

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
      <div className="bg-warm-50 py-10 md:py-16">
        <div className="container text-center">
          <h1 className="heading-display text-3xl md:text-4xl text-neutral-900 mb-2">
            {currentCategory ? currentCategory.name : q ? `Results for "${q}"` : 'All Jewelry'}
          </h1>
          <p className="text-sm text-neutral-500">
            {currentCategory ? currentCategory.description : `${count} products found`}
          </p>
        </div>
      </div>

      <div className="container py-8">
        <div className="flex items-center justify-between mb-8 gap-4">
          <div className="hidden md:flex overflow-x-auto no-scrollbar gap-2">
            <button
              onClick={() => update({ category: null })}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                category === 'all' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => update({ category: cat.slug })}
                className={cn(
                  'px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5',
                  category === cat.slug ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                )}
              >
                {cat.icon && <span>{cat.icon}</span>} {cat.name}
              </button>
            ))}
          </div>

          <FilterButton onOpen={() => update({})} />

          <div className="relative">
            <select
              value={sort}
              onChange={(e) => update({ sort: e.target.value })}
              className="appearance-none bg-white border border-neutral-200 rounded-full px-4 py-2.5 pr-10 text-xs font-medium text-neutral-600 cursor-pointer focus:border-gold-400 focus:ring-1 focus:ring-gold-100 outline-none"
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

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-neutral-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">💎</p>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">No products found</h3>
            <p className="text-sm text-neutral-500 mb-6">Try adjusting your filters or search query</p>
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
