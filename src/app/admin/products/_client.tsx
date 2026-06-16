'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Pencil, Trash2, Search, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatRupees, cn } from '@/lib/utils';
import type { Category, Product } from '@/types';
import ProductForm from './_form';

export default function ProductsAdmin({
  products,
  count,
  categories,
}: {
  products: (Product & { category: Category | null })[];
  count: number;
  categories: Category[];
}) {
  const [list, setList] = useState(products);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const filtered = list.filter((p) =>
    [p.name, p.slug, p.category?.name].join(' ').toLowerCase().includes(q.toLowerCase())
  );

  async function handleDelete(id: string) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Failed to delete');
      return;
    }
    setList(list.filter((p) => p.id !== id));
    toast.success('Product deleted');
  }

  async function handleSave(data: Partial<Product>) {
    const isUpdate = !!data.id;
    const url = isUpdate ? `/api/admin/products/${data.id}` : '/api/admin/products';
    const method = isUpdate ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      toast.error(result.error ?? 'Failed to save');
      return null;
    }
    if (isUpdate) {
      setList(list.map((p) => (p.id === data.id ? { ...p, ...result.product } : p)));
    } else {
      setList([result.product, ...list]);
    }
    toast.success(isUpdate ? 'Product updated' : 'Product created');
    startTransition(() => setOpen(false));
    return result.product;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Products</h1>
          <p className="text-sm text-neutral-500">{count.toLocaleString('en-IN')} total products</p>
        </div>
        <button
          onClick={() => {
            setEditing({ in_stock: true, is_new_arrival: true, images: [], tags: [], stock_count: 0, price: 0, original_price: 0 });
            setOpen(true);
          }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> Add product
        </button>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">No products found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100 text-left bg-neutral-50">
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Product</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Price</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Stock</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500 w-32"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                          {p.images?.[0] && (
                            <Image src={p.images[0]} alt="" fill sizes="48px" className="object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-neutral-400 truncate">/{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{p.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatRupees(p.price)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={cn(
                          'font-medium',
                          p.stock_count === 0 ? 'text-red-600' : p.stock_count <= 5 ? 'text-amber-600' : 'text-green-600'
                        )}
                      >
                        {p.stock_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-xs font-medium px-2.5 py-1 rounded-full',
                          p.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        )}
                      >
                        {p.in_stock ? 'In stock' : 'Out'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link href={`/product/${p.slug}`} target="_blank" className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => {
                            setEditing(p);
                            setOpen(true);
                          }}
                          className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && editing && (
        <ProductForm
          product={editing}
          categories={categories}
          onClose={() => setOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
