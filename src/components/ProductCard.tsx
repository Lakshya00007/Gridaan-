'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingBag, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '@/store/cart';
import { formatRupees } from '@/lib/utils';
import type { Product } from '@/types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { getWishlistState, toggleWishlist } from '@/lib/wishlist-client';

interface Props {
  product: Product;
  index?: number;
  priority?: boolean;
}

export default function ProductCard({ product, index = 0, priority = false }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const router = useRouter();
  const { add: addToCart, setOpen: setCartOpen } = useCart();

  const isOut = !product.in_stock || product.stock_count <= 0;

  useEffect(() => {
    let active = true;
    void getWishlistState(product.id).then((state) => {
      if (active) {
        setWishlisted(state.wishlisted);
      }
    });
    return () => {
      active = false;
    };
  }, [product.id]);

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isOut) {
      toast.error('Out of stock');
      return;
    }
    addToCart(product, 1);
    setCartOpen(true);
    toast.success('Added to bag');
  }

  async function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (wishlistLoading) return;
    setWishlistLoading(true);
    const result = await toggleWishlist(product.id);
    if (!result.signedIn) {
      toast.error('Please sign in to use wishlist');
      setWishlistLoading(false);
      return;
    }

    if (result.error) {
      toast.error(result.error);
      setWishlistLoading(false);
      return;
    }

    setWishlisted(result.wishlisted);
    toast.success(result.wishlisted ? 'Added to wishlist' : 'Removed from wishlist');
    router.refresh();
    setWishlistLoading(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.16) }}
      className="group"
    >
      <Link
        href={`/product/${product.slug}`}
        className="block h-full rounded-2xl border border-stone-200/70 bg-white p-2.5 shadow-[0_16px_36px_-30px_rgba(53,38,18,0.32)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-stone-300 group-hover:shadow-[0_20px_42px_-28px_rgba(53,38,18,0.4)]"
        prefetch
      >
        <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-black/5">
          {!imgLoaded && <div className="absolute inset-0 shimmer" />}
          <Image
            src={product.images?.[0] || '/placeholder.svg'}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn(
              'object-cover transition-transform duration-500 group-hover:scale-[1.03]',
              imgLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setImgLoaded(true)}
            loading={priority ? 'eager' : 'lazy'}
            priority={priority}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
            {product.discount > 0 ? (
              <span className="rounded-full border border-white/70 bg-white/92 px-2.5 py-1 text-[10px] font-semibold text-gold-800 shadow-sm backdrop-blur-sm">
                {product.discount}% Off
              </span>
            ) : null}
            {product.is_new_arrival ? (
              <span className="rounded-full bg-neutral-950 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                New
              </span>
            ) : product.is_trending ? (
              <span className="rounded-full bg-gold-600 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                Trending
              </span>
            ) : null}
            {isOut ? (
              <span className="rounded-full bg-neutral-700 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                Sold Out
              </span>
            ) : null}
          </div>

          <button
            onClick={handleWishlist}
            disabled={wishlistLoading}
            aria-label="Toggle wishlist"
            className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white/92 text-neutral-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-neutral-950 disabled:opacity-60"
          >
            <Heart
              className={cn(
                'w-4 h-4 transition-colors',
                wishlisted ? 'fill-red-500 text-red-500' : 'text-neutral-600'
              )}
            />
          </button>

          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              onClick={handleAddToCart}
              disabled={isOut}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/95 py-2.5 text-xs font-semibold text-neutral-900 shadow-lg backdrop-blur-sm transition-colors hover:bg-white disabled:opacity-50"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Add to Bag
            </button>
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 shadow-lg backdrop-blur-sm"
              aria-hidden
            >
              <Eye className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="px-1 pb-1">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-gold-700">
            {product.category?.name ?? 'Jewellery'}
          </p>
          <h3 className="line-clamp-2 min-h-11 text-sm font-medium leading-[1.35rem] text-neutral-900 transition-colors group-hover:text-gold-700">
            {product.name}
          </h3>
          <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-base font-semibold text-neutral-950">{formatRupees(product.price)}</span>
            {product.discount > 0 ? (
              <>
                <span className="text-sm text-neutral-400 line-through">
                  {formatRupees(product.original_price)}
                </span>
                <span className="text-[10px] font-medium text-emerald-700">
                  Save {formatRupees(product.original_price - product.price)}
                </span>
              </>
            ) : null}
          </div>
          {product.rating > 0 ? (
            <div className="mt-2 flex items-center gap-1.5">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'text-xs',
                    i < Math.floor(product.rating) ? 'text-amber-400' : 'text-neutral-200'
                  )}
                >
                  ★
                </span>
              ))}
              <span className="ml-1 text-[11px] text-neutral-400">({product.review_count})</span>
            </div>
          ) : null}
        </div>
      </Link>
    </motion.div>
  );
}
