'use client';

import { createClient } from '@/lib/supabase/client';

export const WISHLIST_CHANGED_EVENT = 'wishlist:changed';

type WishlistSnapshot = { signedIn: boolean; ids: Set<string> };
let snapshot: Promise<WishlistSnapshot> | null = null;
let snapshotExpiresAt = 0;
let authListenerReady = false;

function getWishlistSnapshot() {
  if (!authListenerReady) {
    authListenerReady = true;
    createClient().auth.onAuthStateChange(() => { snapshot = null; });
  }
  if (snapshot && Date.now() < snapshotExpiresAt) return snapshot;
  snapshotExpiresAt = Date.now() + 30_000;
  snapshot = (async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { signedIn: false, ids: new Set<string>() };
    const { data, error } = await supabase.from('wishlist_items').select('product_id').eq('user_id', user.id);
    if (error) throw error;
    return { signedIn: true, ids: new Set((data ?? []).map((row) => row.product_id)) };
  })().catch((error) => {
    snapshot = null;
    throw error;
  });
  return snapshot;
}

function emitWishlistChanged() {
  snapshot = null;
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
  try {
    const current = await getWishlistSnapshot();
    return { signedIn: current.signedIn, wishlisted: current.ids.has(productId) };
  } catch {
    return { signedIn: false, wishlisted: false };
  }
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
