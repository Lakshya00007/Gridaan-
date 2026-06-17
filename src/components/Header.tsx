'use client';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Heart,
  Search,
  Menu,
  X,
  User,
  LogOut,
  Package,
  Shield,
  Store,
} from 'lucide-react';
import { useUI } from '@/store/ui';
import { useCart } from '@/store/cart';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { getWishlistCount, WISHLIST_CHANGED_EVENT } from '@/lib/wishlist-client';
import { categoryPageConfigs, getCategoryPageHref } from '@/lib/category-pages';

interface HeaderProps {
  categories: Category[];
  user: {
    id: string;
    email: string | null;
    full_name: string | null;
    is_admin: boolean;
  } | null;
}

export default function Header({ categories, user }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const { searchQuery, setSearchQuery, isSearchOpen, setSearchOpen } = useUI();
  const { getCount: getCartCount, setOpen: setCartOpen } = useCart();
  const navLinks = categoryPageConfigs
    .filter((link) =>
      ['women-earrings', 'women-full-sets', 'men-chains', 'men-bracelets'].includes(link.slug)
    )
    .map((link) => {
      const category = categories.find((item) => item.slug === link.filterSlug);
      return category ? { ...link, icon: category.icon } : null;
    })
    .filter((link): link is (typeof categoryPageConfigs)[number] & { icon: string | null } => Boolean(link));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Live wishlist count
  useEffect(() => {
    let active = true;
    if (!user) {
      setWishlistCount(0);
      return;
    }
    const syncCount = async () => {
      const count = await getWishlistCount();
      if (active) {
        setWishlistCount(count);
      }
    };

    void syncCount();
    window.addEventListener(WISHLIST_CHANGED_EVENT, syncCount);

    return () => {
      active = false;
      window.removeEventListener(WISHLIST_CHANGED_EVENT, syncCount);
    };
  }, [user]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setAccountOpen(false);
    startTransition(() => {
      router.refresh();
      router.push('/');
    });
  }

  const cartCount = getCartCount();

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-neutral-900 text-white text-center py-2 px-4 text-[11px] sm:text-xs font-medium tracking-wider">
        <span>✨ Premium-look fashion jewelry from ₹99</span>
        <span className="hidden sm:inline"> · </span>
        <span className="hidden sm:inline">COD available across India</span>
      </div>

      <header
        className={cn(
          'sticky top-0 z-50 transition-all duration-500',
          scrolled ? 'glass shadow-sm border-b border-neutral-100' : 'bg-white'
        )}
      >
        <div className="container">
          <div className="flex items-center justify-between h-16 md:h-20">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 text-neutral-700 hover:text-neutral-900"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href="/" className="flex items-center gap-1.5" prefetch>
              <span className="heading-display text-xl md:text-2xl text-neutral-900">Gridaan</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-8">
              <Link href="/" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
                Home
              </Link>
              <Link
                href="/shop"
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                prefetch
              >
                Shop
              </Link>
              {navLinks.map((link) => (
                <Link
                  key={link.slug}
                  href={getCategoryPageHref(link.slug)}
                  className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                  prefetch
                >
                  {link.shortLabel}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-0.5 sm:gap-1">
              <button
                onClick={() => setSearchOpen(!isSearchOpen)}
                className="p-2.5 text-neutral-600 hover:text-neutral-900 transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
              <Link
                href="/wishlist"
                className="p-2.5 text-neutral-600 hover:text-neutral-900 transition-colors relative"
                aria-label="Wishlist"
              >
                <Heart className={cn('w-5 h-5', wishlistCount > 0 && 'fill-red-500 text-red-500')} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-0 -right-0 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setAccountOpen((v) => !v)}
                  onBlur={() => setTimeout(() => setAccountOpen(false), 150)}
                  className="p-2.5 text-neutral-600 hover:text-neutral-900 transition-colors"
                  aria-label="Account"
                >
                  <User className="w-5 h-5" />
                </button>
                <AnimatePresence>
                  {accountOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white shadow-xl border border-neutral-100 py-2 z-50"
                    >
                      {user ? (
                        <>
                          <div className="px-4 py-2 border-b border-neutral-100">
                            <p className="text-sm font-semibold truncate">{user.full_name ?? user.email}</p>
                            <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                          </div>
                          <Link
                            href="/account"
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                            onClick={() => setAccountOpen(false)}
                          >
                            <Package className="w-4 h-4" /> My Orders
                          </Link>
                          <Link
                            href="/wishlist"
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                            onClick={() => setAccountOpen(false)}
                          >
                            <Heart className="w-4 h-4" /> Wishlist
                          </Link>
                          {user.is_admin && (
                            <Link
                              href="/admin"
                              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gold-700 hover:bg-gold-50"
                              onClick={() => setAccountOpen(false)}
                            >
                              <Shield className="w-4 h-4" /> Admin Panel
                            </Link>
                          )}
                          <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                          >
                            <LogOut className="w-4 h-4" /> Sign out
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            href="/login"
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                            onClick={() => setAccountOpen(false)}
                          >
                            <User className="w-4 h-4" /> Sign in
                          </Link>
                          <Link
                            href="/login?mode=signup"
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                            onClick={() => setAccountOpen(false)}
                          >
                            <Store className="w-4 h-4" /> Create account
                          </Link>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={() => setCartOpen(true)}
                className="p-2.5 text-neutral-600 hover:text-neutral-900 transition-colors relative"
                aria-label="Cart"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0 -right-0 min-w-[18px] h-[18px] px-1 bg-neutral-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isSearchOpen && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!searchQuery.trim()) return;
                  router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
                  setSearchOpen(false);
                }}
                className="overflow-hidden border-t border-neutral-100"
              >
                <div className="max-w-2xl mx-auto py-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search women earrings, necklaces, men chains..."
                      className="w-full pl-12 pr-4 py-3 bg-neutral-50 rounded-full border border-neutral-200 focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none transition-all text-sm"
                      autoFocus
                    />
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white z-50 lg:hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-100">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-1.5"
                >
                  <span className="heading-display text-xl">Gridaan</span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 hover:bg-neutral-100 rounded-full"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Home
                </Link>
                <Link
                  href="/shop"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Shop
                </Link>
                {navLinks.map((link) => (
                  <Link
                    key={link.slug}
                    href={getCategoryPageHref(link.slug)}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-neutral-600 hover:bg-neutral-50"
                  >
                    {link.icon && <span>{link.icon}</span>} {link.shortLabel}
                  </Link>
                ))}
                <div className="my-2 border-t border-neutral-100" />
                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-xl text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  My Orders
                </Link>
                <Link
                  href="/wishlist"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-xl text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  Wishlist
                </Link>
                {user ? (
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left block px-4 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50"
                  >
                    Sign out
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 rounded-xl text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800"
                  >
                    Sign in
                  </Link>
                )}
                {user?.is_admin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 rounded-xl text-sm font-medium text-gold-700 bg-gold-50 hover:bg-gold-100"
                  >
                    Admin Panel
                  </Link>
                )}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
