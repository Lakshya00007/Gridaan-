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
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group"
    >
      <Link
        href={`/product/${product.slug}`}
        className="block h-full rounded-[1.75rem] border border-stone-200/70 bg-gradient-to-br from-white via-[#fffdfa] to-[#f8f1e8] p-3 shadow-[0_22px_56px_-44px_rgba(53,38,18,0.45)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_26px_66px_-42px_rgba(53,38,18,0.55)]"
        prefetch
      >
        <div className="relative aspect-square rounded-[1.35rem] overflow-hidden bg-neutral-100 mb-4 ring-1 ring-black/5">
          {!imgLoaded && <div className="absolute inset-0 shimmer" />}
          <Image
            src={product.images?.[0] || '/placeholder.svg'}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn(
              'object-cover transition-transform duration-700 group-hover:scale-105',
              imgLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setImgLoaded(true)}
            loading={priority ? 'eager' : 'lazy'}
            priority={priority}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.discount > 0 ? (
              <span className="rounded-full bg-gradient-to-r from-red-500 to-rose-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-sm">
                {product.discount}% Off
              </span>
            ) : null}
            {product.is_new_arrival ? (
              <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-sm">
                New
              </span>
            ) : null}
            {product.is_trending ? (
              <span className="rounded-full bg-gradient-to-r from-gold-600 to-gold-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-sm">
                Trending
              </span>
            ) : null}
            {isOut ? (
              <span className="rounded-full bg-neutral-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-sm">
                Sold Out
              </span>
            ) : null}
          </div>

          <button
            onClick={handleWishlist}
            disabled={wishlistLoading}
            aria-label="Toggle wishlist"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/92 backdrop-blur-sm shadow-sm transition-all hover:scale-105 hover:bg-white disabled:opacity-60"
          >
            <Heart
              className={cn(
                'w-4 h-4 transition-colors',
                wishlisted ? 'fill-red-500 text-red-500' : 'text-neutral-600'
              )}
            />
          </button>

          <div className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 transition-all duration-300 group-hover:opacity-100">
            <button
              onClick={handleAddToCart}
              disabled={isOut}
              className="flex-1 flex items-center justify-center gap-2 rounded-[0.95rem] bg-white/95 py-2.5 text-xs font-semibold text-neutral-900 shadow-lg backdrop-blur-sm transition-colors hover:bg-white disabled:opacity-50"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Add to Bag
            </button>
            <span
              className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-white/95 shadow-lg backdrop-blur-sm"
              aria-hidden
            >
              <Eye className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="px-1 pb-1">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-700">
            {product.category?.name ?? 'Jewellery'}
          </p>
          <h3 className="line-clamp-2 text-sm font-medium leading-6 text-neutral-900 transition-colors group-hover:text-gold-700">
            {product.name}
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-base font-bold text-neutral-900">{formatRupees(product.price)}</span>
            {product.discount > 0 ? (
              <>
                <span className="text-sm text-neutral-400 line-through">
                  {formatRupees(product.original_price)}
                </span>
                <span className="rounded-full bg-green-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-green-700">
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
