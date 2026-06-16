'use client';

import { createClient } from '@/lib/supabase/client';

export const WISHLIST_CHANGED_EVENT = 'wishlist:changed';

function emitWishlistChanged() {
  window.dispatchEvent(new Event(WISHLIST_CHANGED_EVENT));
}

export async function getWishlistCount() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count } = await supabase
    .from('wishlist_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  return count ?? 0;
}

export async function getWishlistState(productId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { signedIn: false, wishlisted: false };
  }

  const { count } = await supabase
    .from('wishlist_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('product_id', productId);

  return { signedIn: true, wishlisted: (count ?? 0) > 0 };
}

export async function toggleWishlist(productId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { signedIn: false, wishlisted: false };
  }

  const current = await getWishlistState(productId);
  if (!current.wishlisted) {
    const { error } = await supabase
      .from('wishlist_items')
      .insert({ product_id: productId, user_id: user.id });

    if (error && error.code !== '23505') {
      return { signedIn: true, wishlisted: false, error: error.message };
    }

    emitWishlistChanged();
    return { signedIn: true, wishlisted: true };
  }

  const { error } = await supabase
    .from('wishlist_items')
    .delete()
    .eq('product_id', productId)
    .eq('user_id', user.id);

  if (error) {
    return { signedIn: true, wishlisted: true, error: error.message };
  }

  emitWishlistChanged();
  return { signedIn: true, wishlisted: false };
}
