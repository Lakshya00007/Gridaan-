'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingBag, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '@/store/cart';
import { formatRupees } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Product } from '@/types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface Props {
  product: Product;
  index?: number;
  priority?: boolean;
}

export default function ProductCard({ product, index = 0, priority = false }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const router = useRouter();
  const { add: addToCart, setOpen: setCartOpen } = useCart();

  const isOut = !product.in_stock || product.stock_count <= 0;

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
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to use wishlist');
      return;
    }
    if (wishlisted) {
      await supabase
        .from('wishlist_items')
        .delete()
        .eq('product_id', product.id)
        .eq('user_id', user.id);
      setWishlisted(false);
      toast.success('Removed from wishlist');
    } else {
      const { error } = await supabase
        .from('wishlist_items')
        .insert({ product_id: product.id, user_id: user.id });
      if (error) {
        toast.error(error.message);
        return;
      }
      setWishlisted(true);
      toast.success('Added to wishlist');
    }
    router.refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group"
    >
      <Link href={`/product/${product.slug}`} className="block" prefetch>
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 mb-3">
          {!imgLoaded && <div className="absolute inset-0 shimmer" />}
          <Image
            src={product.images?.[0] || '/placeholder.png'}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn(
              'object-cover transition-transform duration-700 group-hover:scale-110',
              imgLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setImgLoaded(true)}
            loading={priority ? 'eager' : 'lazy'}
            priority={priority}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.discount > 0 && (
              <span className="px-2.5 py-1 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                {product.discount}% Off
              </span>
            )}
            {product.is_new_arrival && (
              <span className="px-2.5 py-1 bg-neutral-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                New
              </span>
            )}
            {product.is_trending && (
              <span className="px-2.5 py-1 bg-gold-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                Trending
              </span>
            )}
            {isOut && (
              <span className="px-2.5 py-1 bg-neutral-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                Sold Out
              </span>
            )}
          </div>

          <button
            onClick={handleWishlist}
            aria-label="Toggle wishlist"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
          >
            <Heart
              className={cn(
                'w-4 h-4 transition-colors',
                wishlisted ? 'fill-red-500 text-red-500' : 'text-neutral-600'
              )}
            />
          </button>

          <div className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <button
              onClick={handleAddToCart}
              disabled={isOut}
              className="flex-1 flex items-center justify-center gap-2 bg-white/95 backdrop-blur-sm text-neutral-900 py-2.5 rounded-xl text-xs font-semibold hover:bg-white transition-colors shadow-lg disabled:opacity-50"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Add to Bag
            </button>
            <span
              className="w-10 h-10 flex items-center justify-center bg-white/95 backdrop-blur-sm rounded-xl shadow-lg"
              aria-hidden
            >
              <Eye className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="px-1">
          <p className="text-[11px] font-medium text-gold-600 uppercase tracking-wider mb-1">
            {product.category?.name ?? ''}
          </p>
          <h3 className="text-sm font-medium text-neutral-900 group-hover:text-gold-700 transition-colors line-clamp-1">
            {product.name}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-base font-bold text-neutral-900">
              {formatRupees(product.price)}
            </span>
            {product.discount > 0 && (
              <>
                <span className="text-sm text-neutral-400 line-through">
                  {formatRupees(product.original_price)}
                </span>
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                  Save {formatRupees(product.original_price - product.price)}
                </span>
              </>
            )}
          </div>
          {product.rating > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
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
              <span className="text-[11px] text-neutral-400 ml-1">({product.review_count})</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
