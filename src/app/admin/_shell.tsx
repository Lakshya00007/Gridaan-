'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, Package, ShoppingCart, Tag, Users, LogOut, ChevronLeft, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface Props {
  user: { id: string; email: string; full_name: string };
  children: React.ReactNode;
}

const nav = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3 },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/coupons', label: 'Coupons', icon: Tag },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminShell({ user, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <aside
        className={cn(
          'bg-neutral-900 text-white flex flex-col transition-all duration-300 sticky top-0 h-screen',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <div className="p-4 flex items-center justify-between border-b border-neutral-800">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-1.5">
              <span className="heading-display text-lg">Lumiere</span>
              <span className="heading-italic text-gold-400 text-sm">Jewels</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-neutral-800"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/admin' && pathname?.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-neutral-800 text-gold-400 border-r-2 border-gold-400'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                )}
                title={collapsed ? label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-neutral-800">
          {!collapsed && (
            <div className="px-2 mb-2">
              <p className="text-xs font-semibold truncate">{user.full_name}</p>
              <p className="text-[10px] text-neutral-400 truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
