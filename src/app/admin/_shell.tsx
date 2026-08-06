'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Bell,
  Boxes,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  FileClock,
  Gift,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Percent,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Star,
  Tags,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { AdminRole } from '@/types';

interface Props {
  user: { id: string; email: string; full_name: string; role: AdminRole };
  children: React.ReactNode;
}

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const nav: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/refunds', label: 'Refunds', icon: ClipboardList },
  { href: '/admin/offers', label: 'Offers & Coupons', icon: Percent },
  { href: '/admin/loyalty', label: 'Loyalty Program', icon: Gift },
  { href: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
  { href: '/admin/categories', label: 'Categories', icon: Tags },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/users', label: 'Admin Users & Roles', icon: UserCog },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: FileClock },
];

function formatRole(role: AdminRole) {
  return role
    .split('_')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function getBreadcrumbs(pathname: string | null) {
  const parts = (pathname ?? '/admin').split('/').filter(Boolean);
  const crumbs = [{ href: '/admin', label: 'Admin' }];
  if (parts.length <= 1) return crumbs;

  let href = '';
  for (const part of parts.slice(1)) {
    href += `/${part}`;
    crumbs.push({
      href: `/admin${href}`,
      label: part
        .split('-')
        .map((item) => item[0].toUpperCase() + item.slice(1))
        .join(' '),
    });
  }
  return crumbs;
}

export default function AdminShell({ user, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const breadcrumbs = useMemo(() => getBreadcrumbs(pathname), [pathname]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f7f5f1] text-neutral-950">
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden border-r border-neutral-800 bg-neutral-950 text-white transition-[width] duration-200 lg:flex lg:flex-col',
          collapsed ? 'w-[4.75rem]' : 'w-72'
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          pathname={pathname}
          onToggle={() => setCollapsed((value) => !value)}
        />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/45"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[20rem] max-w-[86vw] bg-neutral-950 text-white shadow-2xl">
            <SidebarContent
              collapsed={false}
              pathname={pathname}
              onToggle={() => setMobileOpen(false)}
              mobile
            />
          </div>
        </div>
      ) : null}

      <div className={cn('min-h-screen transition-[padding] duration-200', collapsed ? 'lg:pl-[4.75rem]' : 'lg:pl-72')}>
        <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/92 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 text-neutral-700 lg:hidden"
              aria-label="Open admin menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="hidden items-center gap-2 text-xs text-neutral-500 sm:flex">
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.href} className="flex items-center gap-2">
                    {index > 0 ? <span className="text-neutral-300">/</span> : null}
                    <Link href={crumb.href} className="truncate hover:text-gold-700">
                      {crumb.label}
                    </Link>
                  </div>
                ))}
              </div>
              <div className="relative mt-0 sm:mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="search"
                  placeholder="Search orders, products, customers"
                  className="h-9 w-full max-w-xl rounded-lg border border-stone-200 bg-stone-50 pl-9 pr-3 text-sm outline-none transition focus:border-gold-400 focus:bg-white focus:ring-2 focus:ring-gold-100"
                />
              </div>
            </div>

            <Link
              href="/"
              className="hidden h-10 w-10 items-center justify-center rounded-lg border border-stone-200 text-neutral-600 transition hover:border-gold-300 hover:text-neutral-950 sm:inline-flex"
              aria-label="Open storefront"
            >
              <Home className="h-4 w-4" />
            </Link>
            <Link
              href="/admin/notifications"
              className="relative h-10 w-10 rounded-lg border border-stone-200 text-neutral-600 transition hover:border-gold-300 hover:text-neutral-950 inline-flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gold-500" />
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((value) => !value)}
                className="flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 text-left transition hover:border-gold-300"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-950 text-xs font-semibold text-gold-300">
                  {user.full_name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className="block max-w-32 truncate text-xs font-semibold text-neutral-900">{user.full_name}</span>
                  <span className="block text-[10px] text-neutral-500">{formatRole(user.role)}</span>
                </span>
              </button>

              {profileOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 rounded-xl border border-stone-200 bg-white p-2 shadow-xl"
                >
                  <div className="border-b border-stone-100 px-3 py-2">
                    <p className="truncate text-sm font-semibold">{user.full_name}</p>
                    <p className="truncate text-xs text-neutral-500">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={signOut}
                    className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  collapsed,
  pathname,
  onToggle,
  mobile = false,
}: {
  collapsed: boolean;
  pathname: string | null;
  onToggle: () => void;
  mobile?: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        <Link href="/admin" className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold-500/40 bg-gold-500/10 text-gold-300">
            <Activity className="h-4 w-4" />
          </span>
          {!collapsed ? (
            <span className="min-w-0">
              <span className="heading-display block truncate text-lg leading-5">Gridaan</span>
              <span className="block truncate text-[10px] font-medium uppercase tracking-[0.18em] text-gold-300/80">
                Commerce Ops
              </span>
            </span>
          ) : null}
        </Link>
        <button
          type="button"
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white"
          aria-label={mobile ? 'Close sidebar' : 'Toggle sidebar'}
        >
          {mobile ? <X className="h-4 w-4" /> : <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin' && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={mobile ? onToggle : undefined}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                active
                  ? 'bg-white text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active && 'text-gold-600')} />
              {!collapsed ? <span className="truncate">{label}</span> : null}
            </Link>
          );
        })}
      </nav>

      {!collapsed ? (
        <div className="m-3 rounded-xl border border-gold-500/20 bg-gold-500/10 p-3 text-xs text-gold-100">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            Secure Admin
          </div>
          <p className="leading-5 text-gold-100/75">
            Service-role operations stay server-side. Payment secrets are not stored here.
          </p>
        </div>
      ) : null}
    </div>
  );
}
