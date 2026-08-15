'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Heart, ShoppingBag, Minus, Plus, Truck, Shield, RotateCcw, Star, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/store/cart';
import { formatRupees, cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Product } from '@/types';
import { useRouter } from 'next/navigation';
import { getWishlistState, toggleWishlist as toggleWishlistItem } from '@/lib/wishlist-client';
import { businessInfo, JEWELLERY_COMPLIANCE_DISCLAIMER } from '@/lib/business-info';
import { CONSENT_CHANGED_EVENT } from '@/lib/analytics/consent';
import {
  META_PIXEL_READY_EVENT,
  trackMetaAddToCart,
  trackMetaViewContent,
} from '@/lib/analytics/meta';

function metadataValue(metadata: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (Array.isArray(value)) {
      const items = value.filter(
        (item): item is string => typeof item === 'string' && Boolean(item.trim()),
      );
      if (items.length > 0) return items.join(', ');
    }
  }
  return null;
}

export default function ProductPageClient({ product }: { product: Product }) {
  const [selected, setSelected] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const viewedProductRef = useRef<string | null>(null);
  const { add: addToCart, setOpen: setCartOpen } = useCart();
  const router = useRouter();

  const isOut = !product.in_stock || product.stock_count <= 0;
  const metadata = product.metadata ?? {};
  const comboCount = metadataValue(metadata, 'combo_count');
  const includedPieces =
    metadataValue(metadata, 'included_pieces', 'pieces_included') ??
    (comboCount ? `${comboCount} pieces` : null);
  const productDetails = [
    { label: 'SKU', value: product.sku ?? metadataValue(metadata, 'sku') },
    { label: 'Material', value: product.material ?? metadataValue(metadata, 'material') },
    { label: 'Finish / plating', value: metadataValue(metadata, 'finish', 'plating') },
    { label: 'Colour', value: product.colour ?? metadataValue(metadata, 'colour', 'color') },
    { label: 'Size / dimensions', value: product.size ?? metadataValue(metadata, 'dimensions') },
    { label: 'Weight', value: product.weight_grams ? `${product.weight_grams} g` : null },
    { label: 'Included pieces', value: includedPieces },
    {
      label: 'Jewellery type',
      value: product.jewellery_type ?? metadataValue(metadata, 'jewellery_type'),
    },
    { label: 'Country of origin', value: metadataValue(metadata, 'country_of_origin') },
    { label: 'Care instructions', value: metadataValue(metadata, 'care_instructions', 'care') },
    {
      label: 'Return eligibility',
      value:
        typeof product.return_eligible === 'boolean'
          ? product.return_eligible
            ? 'Eligible under the published return policy'
            : 'Not eligible for change-of-mind return'
          : null,
    },
  ].filter((detail): detail is { label: string; value: string } => Boolean(detail.value));

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

  useEffect(() => {
    function tryTrackViewContent() {
      if (viewedProductRef.current === product.id) return;
      const tracked = trackMetaViewContent(product);
      if (tracked) viewedProductRef.current = product.id;
    }

    tryTrackViewContent();
    window.addEventListener(CONSENT_CHANGED_EVENT, tryTrackViewContent);
    window.addEventListener(META_PIXEL_READY_EVENT, tryTrackViewContent);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, tryTrackViewContent);
      window.removeEventListener(META_PIXEL_READY_EVENT, tryTrackViewContent);
    };
  }, [product]);

  async function handleWishlistToggle() {
    if (wishlistLoading) return;
    setWishlistLoading(true);
    const result = await toggleWishlistItem(product.id);
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

  function handleAdd() {
    if (isOut) return;
    const addedQuantity = addToCart(product, quantity);
    if (addedQuantity > 0) trackMetaAddToCart(product, addedQuantity);
    setCartOpen(true);
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
      } catch {
        /* noop */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    }
  }

  return (
    <div className="container pb-16">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
        <div>
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 mb-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={selected}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative w-full h-full"
              >
                <Image
                  src={product.images?.[selected] || '/placeholder.svg'}
                  alt={product.name}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </motion.div>
            </AnimatePresence>
            {product.discount > 0 && (
              <span className="absolute top-4 left-4 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {product.discount}% OFF
              </span>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-3">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  className={cn(
                    'relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all',
                    selected === i ? 'border-gold-500 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                  )}
                >
                  <Image src={img} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="md:py-4">
          <p className="text-xs font-semibold text-gold-600 uppercase tracking-[0.2em] mb-2">
            {product.category?.name}
          </p>
          <h1 className="heading-display text-2xl md:text-3xl text-neutral-900 mb-4">{product.name}</h1>

          {product.review_count > 0 && product.rating > 0 && (
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-4 h-4',
                      i < Math.floor(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'
                    )}
                  />
                ))}
              </div>
              <span className="text-sm text-neutral-500">
                {product.rating} ({product.review_count} reviews)
              </span>
            </div>
          )}

          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-bold text-neutral-900">{formatRupees(product.price)}</span>
            {product.discount > 0 && (
              <>
                <span className="text-lg text-neutral-400 line-through">
                  {formatRupees(product.original_price)}
                </span>
                <span className="text-sm font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                  Save {formatRupees(product.original_price - product.price)}
                </span>
              </>
            )}
          </div>

          <p className="text-sm text-neutral-500 leading-relaxed mb-8">{product.description}</p>

          <div className="mb-6 rounded-2xl border border-gold-100 bg-gold-50/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">
              Fashion jewellery disclosure
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">{JEWELLERY_COMPLIANCE_DISCLAIMER}</p>
          </div>

          {productDetails.length > 0 ? (
            <section className="mb-8 border-y border-neutral-100 py-6" aria-labelledby="product-details-heading">
              <h2 id="product-details-heading" className="mb-4 text-sm font-semibold text-neutral-900">
                Product information
              </h2>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {productDetails.map((detail) => (
                  <div key={detail.label} className="grid grid-cols-[minmax(7rem,0.8fr)_1.2fr] gap-3 text-sm sm:block">
                    <dt className="text-neutral-500">{detail.label}</dt>
                    <dd className="mt-0.5 text-neutral-900 sm:mt-1">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <div className="mb-6">
            {isOut ? (
              <span className="text-sm text-red-500 font-medium">Out of Stock</span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-green-600 font-medium">
                  In Stock ({product.stock_count} left)
                </span>
              </div>
            )}
          </div>

          <div className="mb-8">
            <p className="text-sm font-medium text-neutral-700 mb-3">Quantity</p>
            <div className="inline-flex items-center border border-neutral-200 rounded-full">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-3 hover:bg-neutral-50 rounded-l-full"
                aria-label="Decrease"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stock_count, quantity + 1))}
                className="p-3 hover:bg-neutral-50 rounded-r-full"
                aria-label="Increase"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <button
              onClick={handleAdd}
              disabled={isOut}
              className="flex-1 btn-outline py-4 text-base font-semibold disabled:opacity-50"
            >
              <ShoppingBag className="w-5 h-5" />
              Add to Bag
            </button>
            <a
              href="/checkout"
              onClick={(e) => {
                if (isOut) return;
                e.preventDefault();
                const addedQuantity = addToCart(product, quantity);
                if (addedQuantity > 0) trackMetaAddToCart(product, addedQuantity);
                router.push('/checkout');
              }}
              className={cn(
                'flex-1 btn-primary py-4 text-base font-semibold',
                isOut && 'pointer-events-none opacity-50'
              )}
            >
              Buy Now
            </a>
          </div>

          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-neutral-100">
            <button
              onClick={handleWishlistToggle}
              disabled={wishlistLoading}
              className="flex items-center gap-2 text-sm text-neutral-600 hover:text-red-500 transition-colors"
            >
              <Heart className={cn('w-5 h-5', wishlisted && 'fill-red-500 text-red-500')} />
              {wishlisted ? 'Wishlisted' : 'Add to Wishlist'}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <Share2 className="w-5 h-5" />
              Share
            </button>
          </div>

          <div className="space-y-4">
            {[
              {
                icon: Truck,
                text: `Free shipping on eligible subtotals of ${formatRupees(businessInfo.shipping.freeShippingThresholdRupees)} or more`,
              },
              { icon: Shield, text: 'Secure online payments powered by Razorpay' },
              { icon: RotateCcw, text: '7-day return request for eligible unused products' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-gold-500" />
                <span className="text-sm text-neutral-500">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
