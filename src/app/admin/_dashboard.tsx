'use client';
import Link from 'next/link';
import { DollarSign, ShoppingCart, Package, Users, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { formatRupees, formatDate, cn } from '@/lib/utils';
import type { Order } from '@/types';

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
}

const statusColor: Record<string, string> = {
  placed: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  returned: 'bg-neutral-200 text-neutral-700',
};

export default function AdminDashboard({ stats, recentOrders }: { stats: Stats; recentOrders: Order[] }) {
  const cards = [
    { label: 'Total Revenue', value: formatRupees(stats.totalRevenue), icon: DollarSign, color: 'bg-green-50 text-green-600' },
    { label: 'Total Orders', value: stats.totalOrders.toLocaleString('en-IN'), icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
    { label: 'Customers', value: stats.totalCustomers.toLocaleString('en-IN'), icon: Users, color: 'bg-purple-50 text-purple-600' },
    { label: 'Products', value: stats.totalProducts.toLocaleString('en-IN'), icon: Package, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-500">Real-time overview of your store</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-neutral-500">{label}</span>
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', color)}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900">{value}</p>
          </div>
        ))}
      </div>

      {(stats.outOfStock > 0 || stats.lowStock > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1 text-sm">
            {stats.outOfStock > 0 && (
              <span className="font-medium text-amber-900">{stats.outOfStock} products are out of stock.</span>
            )}
            {stats.outOfStock > 0 && stats.lowStock > 0 && ' · '}
            {stats.lowStock > 0 && (
              <span className="font-medium text-amber-900">{stats.lowStock} products are low in stock.</span>
            )}
          </div>
          <Link href="/admin/products?filter=low_stock" className="text-sm font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1">
            Review <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100">
          <h2 className="font-semibold">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-gold-700 hover:underline">View all</Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500">Order</th>
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500">Customer</th>
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500">Date</th>
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500">Total</th>
                  <th className="px-5 py-3 text-xs font-semibold text-neutral-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                    <td className="px-5 py-3 text-sm font-medium">
                      <Link href={`/admin/orders?id=${o.id}`} className="hover:underline">
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm text-neutral-600">{o.customer_name}</td>
                    <td className="px-5 py-3 text-sm text-neutral-500">{formatDate(o.created_at)}</td>
                    <td className="px-5 py-3 text-sm font-semibold">{formatRupees(o.total)}</td>
                    <td className="px-5 py-3">
                      <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', statusColor[o.order_status])}>
                        {o.order_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
