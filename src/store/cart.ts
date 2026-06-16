/**
 * Client-side cart store backed by Supabase when the user is signed-in,
 * falling back to a localStorage-based guest cart otherwise. Items are
 * keyed by product_id with quantity merging.
 */
'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/types';

interface GuestCartItem {
  product: Product;
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

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      guest: [],
      isOpen: false,
      setOpen: (open) => set({ isOpen: open }),
      add: (product, quantity = 1) => {
        const guest = get().guest;
        const existing = guest.find((g) => g.product.id === product.id);
        if (existing) {
          set({
            guest: guest.map((g) =>
              g.product.id === product.id
                ? { ...g, quantity: g.quantity + quantity }
                : g
            ),
          });
        } else {
          set({ guest: [...guest, { product, quantity }] });
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
      name: 'lumiere-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ guest: s.guest }),
    }
  )
);
