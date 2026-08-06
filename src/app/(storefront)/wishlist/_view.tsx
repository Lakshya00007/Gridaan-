'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { WISHLIST_CHANGED_EVENT } from '@/lib/wishlist-client';

export default function WishlistView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    const loadWishlist = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        if (!active) return;
        setSignedIn(false);
        setProducts([]);
        setLoading(false);
        return;
      }

      if (active) {
        setSignedIn(true);
      }

      const { data: wishlistData, error } = await supabase
        .from('wishlist_items')
        .select('product:products(*)')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false });

      if (!active) return;

      if (!error) {
        setProducts(
          (wishlistData ?? [])
            .map((row: { product: Product | Product[] | null }) =>
              Array.isArray(row.product) ? row.product[0] : row.product
            )
            .filter(Boolean) as Product[]
        );
      }
      setLoading(false);
    };

    void loadWishlist();
    window.addEventListener(WISHLIST_CHANGED_EVENT, loadWishlist);

    return () => {
      active = false;
      window.removeEventListener(WISHLIST_CHANGED_EVENT, loadWishlist);
    };
  }, []);

  if (loading) {
    return (
      <div className="container py-12">
        <div className="h-8 w-40 bg-neutral-100 rounded mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square bg-neutral-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (signedIn === false) {
    return (
      <div className="container py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-neutral-50 flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-neutral-300" />
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 mb-2">Sign in to view your wishlist</h3>
        <p className="text-sm text-neutral-500 mb-6">Save your favorite pieces for later</p>
        <Link href="/login?next=/wishlist" className="btn-primary">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-warm-50 py-10 md:py-16">
        <div className="container text-center">
          <h1 className="heading-display text-3xl md:text-4xl text-neutral-900 mb-2">My Wishlist</h1>
          <p className="text-sm text-neutral-500">{products.length} items saved</p>
        </div>
      </div>
      <div className="container py-8 md:py-12">
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-neutral-50 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-neutral-300" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">Your wishlist is empty</h3>
            <p className="text-sm text-neutral-500 mb-6">Save your favorite pieces for later</p>
            <Link href="/shop" className="btn-primary">Explore Collection</Link>
          </div>
        )}
      </div>
    </div>
  );
}
