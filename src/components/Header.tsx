'use client';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  ChevronDown,
} from 'lucide-react';
import { useUI } from '@/store/ui';
import { useCart } from '@/store/cart';
import { createClient } from '@/lib/supabase/client';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { getWishlistCount, WISHLIST_CHANGED_EVENT } from '@/lib/wishlist-client';
import type { CategoryPageConfig } from '@/lib/category-pages';
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
  const [activeMenu, setActiveMenu] = useState<'women' | 'men' | null>(null);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const { searchQuery, setSearchQuery, isSearchOpen, setSearchOpen } = useUI();
  const { getCount: getCartCount, setOpen: setCartOpen } = useCart();
  const availableSlugs = new Set(categories.map((category) => category.slug));
  const womenLinks = categoryPageConfigs.filter(
    (link) => link.slug.startsWith('women-') && availableSlugs.has(link.slug)
  );
  const menLinks = categoryPageConfigs.filter(
    (link) => link.slug.startsWith('men-') && availableSlugs.has(link.slug)
  );
  const fullSetsLink =
    womenLinks.find((link) => link.slug === 'women-full-sets') ??
    categoryPageConfigs.find((link) => link.slug === 'women-full-sets') ??
    null;
  const homeActive = pathname === '/';
  const shopActive = pathname === '/shop';
  const womenActive = pathname.startsWith('/category/women-');
  const menActive = pathname.startsWith('/category/men-');
  const fullSetsActive = pathname === getCategoryPageHref('women-full-sets');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setActiveMenu(null);
    setMobileOpen(false);
    setAccountOpen(false);
  }, [pathname]);

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
      <div className="bg-neutral-950 px-4 py-2 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-white sm:text-[11px]">
        <span>Artificial fashion jewellery from ₹99</span>
        <span className="hidden sm:inline"> · </span>
        <span className="hidden sm:inline">COD available across India</span>
      </div>

      <header
        className={cn(
          'sticky top-0 z-50 transition-all duration-500',
          scrolled
            ? 'border-b border-white/60 bg-white/78 backdrop-blur-2xl shadow-[0_18px_50px_-38px_rgba(57,38,16,0.55)]'
            : 'bg-white/95'
        )}
      >
        <div className="container">
          <div className="flex h-[4.25rem] items-center justify-between md:h-[4.75rem]">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-stone-100 hover:text-neutral-950 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link
              href="/"
              className="relative h-10 w-[122px] shrink-0 sm:h-11 sm:w-[145px] lg:h-12 lg:w-[162px]"
              prefetch
              aria-label="Gridaan home"
            >
              <Image
                src="/logo-header.png"
                alt="Gridaan"
                fill
                priority
                sizes="(min-width: 1024px) 162px, (min-width: 640px) 145px, 122px"
                className="object-contain object-left"
              />
            </Link>

            <nav className="hidden items-center gap-0.5 lg:flex">
              <HeaderNavLink href="/" label="Home" active={homeActive} />
              <HeaderNavLink href="/shop" label="Shop" active={shopActive} />
              <div
                className="relative"
                onMouseEnter={() => setActiveMenu('women')}
                onMouseLeave={() => setActiveMenu(null)}
              >
                <button
                  type="button"
                  onFocus={() => setActiveMenu('women')}
                  aria-expanded={activeMenu === 'women'}
                  className={navTriggerClass(womenActive || activeMenu === 'women')}
                >
                  Women
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform', activeMenu === 'women' && 'rotate-180')}
                  />
                </button>
                <AnimatePresence>
                  {activeMenu === 'women' && (
                    <DesktopMenuPanel
                      title="Women"
                      subtitle="Everyday earrings, necklines, festive styling, and coordinated sets."
                      links={womenLinks}
                    />
                  )}
                </AnimatePresence>
              </div>
              <div
                className="relative"
                onMouseEnter={() => setActiveMenu('men')}
                onMouseLeave={() => setActiveMenu(null)}
              >
                <button
                  type="button"
                  onFocus={() => setActiveMenu('men')}
                  aria-expanded={activeMenu === 'men'}
                  className={navTriggerClass(menActive || activeMenu === 'men')}
                >
                  Men
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform', activeMenu === 'men' && 'rotate-180')}
                  />
                </button>
                <AnimatePresence>
                  {activeMenu === 'men' && (
                    <DesktopMenuPanel
                      title="Men"
                      subtitle="Chains, pendants, rings, kadas, and bracelets with a polished edge."
                      links={menLinks}
                    />
                  )}
                </AnimatePresence>
              </div>
              {fullSetsLink ? (
                <HeaderNavLink
                  href={getCategoryPageHref(fullSetsLink.slug)}
                  label="Full Sets"
                  active={fullSetsActive}
                />
              ) : null}
            </nav>

            <div className="flex items-center gap-0.5 sm:gap-1">
              <button
                onClick={() => setSearchOpen(!isSearchOpen)}
                className={headerIconClass}
                aria-label="Search"
              >
                <Search className="h-[18px] w-[18px]" />
              </button>
              <Link
                href="/wishlist"
                className={cn(headerIconClass, 'relative')}
                aria-label="Wishlist"
              >
                <Heart className={cn('h-[18px] w-[18px]', wishlistCount > 0 && 'fill-red-500 text-red-500')} />
                {wishlistCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-red-500 to-red-400 text-white text-[10px] font-bold shadow-sm flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setAccountOpen((v) => !v)}
                  onBlur={() => setTimeout(() => setAccountOpen(false), 150)}
                  className={headerIconClass}
                  aria-label="Account"
                >
                  <User className="h-[18px] w-[18px]" />
                </button>
                <AnimatePresence>
                  {accountOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-3 w-60 rounded-[1.5rem] border border-stone-200/80 bg-white/95 py-2 shadow-[0_24px_60px_-38px_rgba(53,38,18,0.45)] backdrop-blur z-50"
                    >
                      {user ? (
                        <>
                          <div className="px-4 py-3 border-b border-stone-100">
                            <p className="text-sm font-semibold truncate text-neutral-900">{user.full_name ?? user.email}</p>
                            <p className="text-xs text-neutral-400 truncate mt-1">{user.email}</p>
                          </div>
                          <Link
                            href="/account"
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-cream-50"
                            onClick={() => setAccountOpen(false)}
                          >
                            <Package className="w-4 h-4" /> My Orders
                          </Link>
                          <Link
                            href="/wishlist"
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-cream-50"
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
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-cream-50"
                            onClick={() => setAccountOpen(false)}
                          >
                            <User className="w-4 h-4" /> Sign in
                          </Link>
                          <Link
                            href="/login?mode=signup"
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-cream-50"
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
                className={cn(headerIconClass, 'relative')}
                aria-label="Cart"
              >
                <ShoppingBag className="h-[18px] w-[18px]" />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-gold-600 to-gold-500 text-white text-[10px] font-bold shadow-sm flex items-center justify-center">
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
                className="overflow-hidden border-t border-stone-100"
              >
                <div className="max-w-3xl mx-auto py-5">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search women earrings, necklaces, men chains..."
                      className="w-full pl-12 pr-4 py-3.5 bg-white rounded-full border border-stone-200 shadow-[0_20px_45px_-38px_rgba(53,38,18,0.35)] focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none transition-all text-sm"
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
              className="fixed inset-y-0 left-0 z-50 flex w-[21rem] max-w-[90vw] flex-col bg-[#fcfaf7] shadow-[0_35px_70px_-42px_rgba(53,38,18,0.55)] lg:hidden"
            >
              <div className="border-b border-stone-200/70 bg-white/80 px-5 py-4">
                <div className="flex items-center justify-between">
                  <Link
                    href="/"
                    onClick={() => setMobileOpen(false)}
                    className="relative h-10 w-[125px] shrink-0"
                    aria-label="Gridaan home"
                  >
                    <Image
                      src="/logo-header.png"
                      alt="Gridaan"
                      fill
                      priority
                      sizes="125px"
                      className="object-contain object-left"
                    />
                  </Link>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-stone-100 hover:text-neutral-950"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href="/shop"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white"
                  >
                    Shop All
                  </Link>
                  {fullSetsLink ? (
                    <Link
                      href={getCategoryPageHref(fullSetsLink.slug)}
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-800"
                    >
                      Full Sets
                    </Link>
                  ) : null}
                </div>
              </div>
              <nav className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-2 gap-2 border-b border-stone-200/70 pb-5">
                  <Link
                    href="/"
                    onClick={() => setMobileOpen(false)}
                    className={mobileLinkClass(homeActive)}
                  >
                    Home
                  </Link>
                  <Link
                    href="/shop"
                    onClick={() => setMobileOpen(false)}
                    className={mobileLinkClass(shopActive)}
                  >
                    Shop
                  </Link>
                </div>
                <MobileCategorySection title="Women" links={womenLinks} onNavigate={() => setMobileOpen(false)} />
                <MobileCategorySection title="Men" links={menLinks} onNavigate={() => setMobileOpen(false)} />
                <div className="border-t border-stone-200/70 pt-4">
                  <Link
                    href="/account"
                    onClick={() => setMobileOpen(false)}
                    className={mobileLinkClass(pathname === '/account')}
                  >
                    My Orders
                  </Link>
                  <Link
                    href="/wishlist"
                    onClick={() => setMobileOpen(false)}
                    className={mobileLinkClass(pathname === '/wishlist')}
                  >
                    Wishlist
                  </Link>
                  {user ? (
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 rounded-[1rem]"
                    >
                      Sign out
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-3 rounded-[1rem] text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800"
                    >
                      Sign in
                    </Link>
                  )}
                  {user?.is_admin ? (
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="block mt-2 px-4 py-3 rounded-[1rem] text-sm font-medium text-gold-700 bg-gold-50 hover:bg-gold-100"
                    >
                      Admin Panel
                    </Link>
                  ) : null}
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function HeaderNavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link href={href} className={navTriggerClass(Boolean(active))} prefetch>
      {label}
    </Link>
  );
}

function DesktopMenuPanel({
  title,
  subtitle,
  links,
}: {
  title: string;
  subtitle: string;
  links: CategoryPageConfig[];
}) {
  return (
    <div className="absolute left-1/2 top-full z-[60] w-[46rem] max-w-[calc(100vw-3rem)] -translate-x-1/2 pt-3">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.18 }}
        className="grid grid-cols-[0.72fr_1.28fr] gap-6 rounded-2xl border border-stone-200/80 bg-[#fffdf9] p-6 shadow-[0_24px_60px_-30px_rgba(42,30,17,0.28)]"
      >
        <div className="border-r border-stone-200/70 pr-6">
          <p className="heading-display text-2xl text-neutral-950">{title}</p>
          <p className="mt-2 text-sm leading-6 text-neutral-500">{subtitle}</p>
          <Link
            href="/shop"
            className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-gold-700 transition-colors hover:text-gold-900"
          >
            Shop all jewellery
            <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-7 gap-y-1">
          {links.map((link) => (
            <Link
              key={link.slug}
              href={getCategoryPageHref(link.slug)}
              className="group flex min-h-12 items-center justify-between gap-3 border-b border-stone-200/60 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:border-gold-300 hover:text-gold-800"
            >
              <span>{link.shortLabel}</span>
              <span className="text-gold-500 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
                →
              </span>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function MobileCategorySection({
  title,
  links,
  onNavigate,
}: {
  title: string;
  links: CategoryPageConfig[];
  onNavigate: () => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-gold-700">{title}</p>
      <div className="grid grid-cols-2 gap-x-4">
        {links.map((link) => (
          <Link
            key={link.slug}
            href={getCategoryPageHref(link.slug)}
            onClick={onNavigate}
            className="border-b border-stone-200/70 py-2.5 text-sm text-neutral-700 transition-colors hover:text-gold-800"
          >
            {link.shortLabel}
          </Link>
        ))}
      </div>
    </div>
  );
}

function navTriggerClass(active: boolean) {
  return cn(
    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all duration-200',
    active
      ? 'bg-neutral-950 text-white'
      : 'text-neutral-600 hover:bg-stone-100 hover:text-neutral-950'
  );
}

function mobileLinkClass(active: boolean) {
  return cn(
    'block rounded-xl px-4 py-2.5 text-center text-sm font-medium transition-colors',
    active ? 'bg-neutral-950 text-white' : 'bg-white text-neutral-700 hover:bg-stone-100'
  );
}

const headerIconClass =
  'flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-stone-100 hover:text-neutral-950';
