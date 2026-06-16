'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UIState {
  isCartOpen: boolean;
  isSearchOpen: boolean;
  setCartOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      isCartOpen: false,
      isSearchOpen: false,
      setCartOpen: (open) => set({ isCartOpen: open }),
      setSearchOpen: (open) => set({ isSearchOpen: open }),
      searchQuery: '',
      setSearchQuery: (q) => set({ searchQuery: q }),
    }),
    {
      name: 'gridaan-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ searchQuery: s.searchQuery }),
    }
  )
);
