'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Activity,
  ChevronDown,
  ExternalLink,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getAdminRouteLabel,
  getVisibleAdminNavigation,
  isAdminRouteActive,
  type AdminNavigationItem,
} from '@/lib/admin-navigation';
import { cn } from '@/lib/utils';
import type { AdminRole } from '@/types';

interface Props {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: AdminRole;
    permissions: string[];
    legacyIsAdmin: boolean;
  };
  children: React.ReactNode;
}

const sectionOrder = ['Overview', 'Commerce', 'Finance', 'Catalog', 'Insights', 'System'] as const;

function formatRole(role: AdminRole) {
  return role
    .split('_')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

export default function AdminShell({ user, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const navigation = getVisibleAdminNavigation({
    role: user.role,
    explicitPermissions: user.permissions,
    legacyIsAdmin: user.legacyIsAdmin,
  });

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="grid min-h-dvh w-full overflow-x-clip bg-[#f6f3ed] text-neutral-950 lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh border-r border-white/10 bg-neutral-950 text-white lg:flex lg:flex-col">
        <SidebarContent navigation={navigation} pathname={pathname} role={user.role} />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-stone-200/90 bg-white/95 backdrop-blur-xl">
          <div className="flex h-16 min-w-0 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-stone-200 text-neutral-700 transition-colors hover:bg-stone-50 focus-visible:ring-4 focus-visible:ring-gold-100 lg:hidden"
                  aria-label="Open admin navigation"
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
                <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[272px] max-w-[88vw] bg-neutral-950 text-white shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left lg:hidden">
                  <Dialog.Title className="sr-only">Admin navigation</Dialog.Title>
                  <SidebarContent
                    navigation={navigation}
                    pathname={pathname}
                    role={user.role}
                    closeButton={
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                          aria-label="Close admin navigation"
                        >
                          <X className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </Dialog.Close>
                    }
                    mobile
                  />
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-neutral-500">Admin / {getAdminRouteLabel(pathname)}</p>
              <p className="truncate text-sm font-semibold text-neutral-950 sm:text-base">{getAdminRouteLabel(pathname)}</p>
            </div>

            <Link
              href="/"
              target="_blank"
              className="hidden h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-neutral-700 transition-colors hover:border-gold-300 hover:text-neutral-950 sm:inline-flex"
            >
              Storefront
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="flex h-11 min-w-11 items-center gap-2 rounded-lg border border-stone-200 bg-white px-2 text-left transition-colors hover:border-gold-300 focus-visible:ring-4 focus-visible:ring-gold-100"
                  aria-label="Open admin profile menu"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-950 text-xs font-semibold text-gold-300">
                    {user.full_name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden min-w-0 sm:block">
                    <span className="block max-w-32 truncate text-xs font-semibold">{user.full_name}</span>
                    <span className="block text-[10px] text-neutral-500">{formatRole(user.role)}</span>
                  </span>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-neutral-400 sm:block" aria-hidden="true" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 w-64 rounded-xl border border-stone-200 bg-white p-2 shadow-xl outline-none"
                >
                  <div className="border-b border-stone-100 px-3 py-2.5">
                    <p className="truncate text-sm font-semibold">{user.full_name}</p>
                    <p className="truncate text-xs text-neutral-500">{user.email}</p>
                  </div>
                  <DropdownMenu.Item
                    onSelect={() => void signOut()}
                    className="mt-2 flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-medium text-red-700 outline-none hover:bg-red-50 focus:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>

        <main id="main" className="min-w-0 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  navigation,
  pathname,
  role,
  closeButton,
  mobile = false,
}: {
  navigation: AdminNavigationItem[];
  pathname: string | null;
  role: AdminRole;
  closeButton?: React.ReactNode;
  mobile?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <Link href="/admin" className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold-500/35 bg-gold-500/10 text-gold-300">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="heading-display block truncate text-lg leading-5">Gridaan</span>
            <span className="block truncate text-[9px] font-semibold uppercase text-gold-300/75">
              Commerce Ops
            </span>
          </span>
        </Link>
        {closeButton}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-label="Admin modules">
        {sectionOrder.map((section) => {
          const items = navigation.filter((item) => item.section === section);
          if (!items.length) return null;
          return (
            <div key={section} className="mb-4 last:mb-0">
              <p className="mb-1.5 px-3 text-[9px] font-semibold uppercase text-neutral-500">
                {section}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = isAdminRouteActive(pathname, item.href);
                  const link = (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-10 items-center gap-3 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-gold-300',
                        active
                          ? 'border-gold-300/25 bg-gold-300/10 text-gold-100'
                          : 'border-transparent text-neutral-400 hover:bg-white/[0.06] hover:text-white'
                      )}
                    >
                      <item.icon
                        className={cn('h-4 w-4 shrink-0', active && 'text-gold-300')}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.label}</span>
                      {item.featureStatus === 'read_only' ? (
                        <span className="ml-auto text-[9px] uppercase text-neutral-500">View</span>
                      ) : null}
                    </Link>
                  );
                  return mobile ? <Dialog.Close key={item.href} asChild>{link}</Dialog.Close> : link;
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <ShieldCheck className="h-4 w-4 text-gold-300" aria-hidden="true" />
          <span className="truncate">Secure admin · {formatRole(role)}</span>
        </div>
      </div>
    </div>
  );
}
