/**
 * Client-side cart store backed by Supabase when the user is signed-in,
 * falling back to a localStorage-based guest cart otherwise. Items are
 * keyed by product_id with quantity merging.
 */
'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartProductSnapshot, Product } from '@/types';

interface GuestCartItem {
  product: CartProductSnapshot;
  quantity: number;
}

interface CartState {
  guest: GuestCartItem[];
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  add: (product: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  getCount: () => number;
  getSubtotal: () => number;
}

function toCartProductSnapshot(product: Product): CartProductSnapshot {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    original_price: product.original_price,
    discount: product.discount,
    images: product.images,
    in_stock: product.in_stock,
    stock_count: product.stock_count,
    category: product.category
      ? {
          id: product.category.id,
          slug: product.category.slug,
          name: product.category.name,
        }
      : null,
  };
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      guest: [],
      isOpen: false,
      setOpen: (open) => set({ isOpen: open }),
      add: (product, quantity = 1) => {
        const snapshot = toCartProductSnapshot(product);
        const guest = get().guest;
        const existing = guest.find((g) => g.product.id === snapshot.id);
        if (existing) {
          set({
            guest: guest.map((g) =>
              g.product.id === snapshot.id
                ? {
                    ...g,
                    product: snapshot,
                    quantity: Math.min(g.quantity + quantity, snapshot.stock_count),
                  }
                : g
            ),
          });
        } else {
          set({ guest: [...guest, { product: snapshot, quantity: Math.min(quantity, snapshot.stock_count) }] });
        }
      },
      setQuantity: (productId, quantity) => {
        if (quantity <= 0) return get().remove(productId);
        set({
          guest: get().guest.map((g) =>
            g.product.id === productId ? { ...g, quantity } : g
          ),
        });
      },
      remove: (productId) => {
        set({ guest: get().guest.filter((g) => g.product.id !== productId) });
      },
      clear: () => set({ guest: [] }),
      getCount: () => get().guest.reduce((a, g) => a + g.quantity, 0),
      getSubtotal: () =>
        get().guest.reduce((a, g) => a + g.product.price * g.quantity, 0),
    }),
    {
      name: 'gridaan-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ guest: s.guest }),
    }
  )
);
