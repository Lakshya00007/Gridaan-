'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Archive, Copy, Plus, Pencil, Search, Star, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime, formatRupees, cn } from '@/lib/utils';
import type { Category, Product } from '@/types';
import ProductForm from './_form';
import { AdminPageHeader, EmptyState } from '../_components/ui';
import { AdminConfirmDialog } from '../_components/confirm-dialog';

export default function ProductsAdmin({
  products,
  count,
  categories,
  page,
  pageSize,
  hasMore,
}: {
  products: (Product & { category: Category | null })[];
  count: number;
  categories: Category[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}) {
  const [list, setList] = useState(products);
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    { type: 'delete'; product: Product } | { type: 'bulk_archive' } | null
  >(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const filtered = list.filter((p) =>
    [p.name, p.slug, p.sku, p.category?.name].join(' ').toLowerCase().includes(q.toLowerCase())
  );

  const selectedProducts = list.filter((product) => selected.includes(product.id));

  async function handleDelete(id: string) {
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

  async function updateProduct(product: Product, patch: Partial<Product>, success: string) {
    const saved = await handleSave({ ...product, ...patch });
    if (saved) toast.success(success);
  }

  async function duplicateProduct(product: Product) {
    const copy = {
      ...product,
      id: undefined,
      name: `${product.name} Copy`,
      slug: `${product.slug}-copy-${Date.now().toString().slice(-4)}`,
      sku: product.sku ? `${product.sku}-COPY` : null,
      is_active: false,
      is_featured: false,
      is_trending: false,
      is_new_arrival: false,
      is_best_seller: false,
    };
    await handleSave(copy);
  }

  async function bulkArchive() {
    if (selectedProducts.length === 0) return;
    for (const product of selectedProducts) {
      await handleSave({ ...product, is_active: false, archived_at: new Date().toISOString() });
    }
    setSelected([]);
    toast.success('Selected products archived');
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdminPageHeader
        title="Products"
        description={`${count.toLocaleString('en-IN')} products in the catalog.`}
        action={
          <button
            onClick={() => {
              setEditing({
                in_stock: true,
                is_active: true,
                is_new_arrival: true,
                images: [],
                image_metadata: [],
                tags: [],
                stock_count: 0,
                reserved_stock: 0,
                low_stock_threshold: 5,
                reorder_level: 0,
                price: 0,
                original_price: 0,
                return_eligible: true,
                cod_eligible: false,
              });
              setOpen(true);
            }}
            className="btn-primary min-h-11"
          >
            <Plus className="w-4 h-4" /> Add product
          </button>
        }
      />

      {selected.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold-200 bg-gold-50 p-3">
          <p className="text-sm font-semibold text-gold-900">{selected.length} selected</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPendingAction({ type: 'bulk_archive' })} className="min-h-11 rounded-lg bg-neutral-950 px-3 py-2 text-xs font-semibold text-white">
              Bulk archive
            </button>
            <button type="button" onClick={() => setSelected([])} className="rounded-lg border border-gold-200 bg-white px-3 py-2 text-xs font-semibold text-gold-800">
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          aria-label="Search products on this page"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">
          Showing {(page - 1) * pageSize + (list.length ? 1 : 0)}–{(page - 1) * pageSize + list.length} of {count.toLocaleString('en-IN')}
        </p>
        <div className="flex items-center gap-2" aria-label="Product pagination">
          <button
            type="button"
            onClick={() => router.push(`/admin/products?page=${page - 1}`)}
            disabled={page <= 1}
            className="min-h-11 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-neutral-500">Page {page}</span>
          <button
            type="button"
            onClick={() => router.push(`/admin/products?page=${page + 1}`)}
            disabled={!hasMore}
            className="min-h-11 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState title="No matching products" description="Adjust the search or move to another catalog page." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[86rem]" aria-label="Products">
              <thead>
                <tr className="border-b border-neutral-100 text-left bg-neutral-50">
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Product</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">SKU</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Selling</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">MRP</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Discount</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Stock</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Reserved</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Available</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Featured</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500">Updated</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-500 w-32"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(p.id)}
                          onChange={(e) =>
                            setSelected((current) =>
                              e.target.checked ? [...current, p.id] : current.filter((id) => id !== p.id)
                            )
                          }
                          aria-label={`Select ${p.name}`}
                        />
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
                    <td className="px-4 py-3 text-sm text-neutral-600">{p.sku ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{p.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatRupees(p.price)}</td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{formatRupees(p.original_price)}</td>
                    <td className="px-4 py-3 text-sm text-green-700">{p.discount > 0 ? `${p.discount}%` : '—'}</td>
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
                    <td className="px-4 py-3 text-sm text-neutral-600">{p.reserved_stock ?? 0}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{Math.max(0, p.stock_count - (p.reserved_stock ?? 0))}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-xs font-medium px-2.5 py-1 rounded-full',
                          p.is_active === false
                            ? 'bg-neutral-200 text-neutral-700'
                            : p.in_stock
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                        )}
                      >
                        {p.is_active === false ? 'Inactive' : p.in_stock ? 'In stock' : 'Out'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.is_featured || p.is_trending || p.is_best_seller ? (
                        <Star className="h-4 w-4 fill-gold-500 text-gold-500" />
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">{formatDateTime(p.updated_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link href={`/product/${p.slug}`} target="_blank" aria-label={`View ${p.name} on storefront`} className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => {
                            setEditing(p);
                            setOpen(true);
                          }}
                          className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => duplicateProduct(p)}
                          className="p-2 text-neutral-400 hover:text-gold-700 hover:bg-gold-50 rounded-lg"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            updateProduct(
                              p,
                              p.is_active === false
                                ? { is_active: true, archived_at: null }
                                : { is_active: false, archived_at: new Date().toISOString() },
                              p.is_active === false ? 'Product activated' : 'Product archived'
                            )
                          }
                          className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg"
                          title={p.is_active === false ? 'Activate' : 'Archive'}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPendingAction({ type: 'delete', product: p })}
                          className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
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

      <AdminConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open && !confirmBusy) setPendingAction(null);
        }}
        title={pendingAction?.type === 'delete' ? 'Delete product permanently?' : 'Archive selected products?'}
        description={
          pendingAction?.type === 'delete'
            ? `${pendingAction.product.name} will be permanently deleted. Archive it instead when historical orders reference this product.`
            : `${selectedProducts.length} selected products will be hidden from the active catalog.`
        }
        confirmLabel={pendingAction?.type === 'delete' ? 'Delete product' : 'Archive products'}
        destructive={pendingAction?.type === 'delete'}
        busy={confirmBusy}
        onConfirm={() => {
          if (!pendingAction) return;
          setConfirmBusy(true);
          const action = pendingAction.type === 'delete'
            ? handleDelete(pendingAction.product.id)
            : bulkArchive();
          void action.finally(() => {
            setConfirmBusy(false);
            setPendingAction(null);
          });
        }}
      />
    </div>
  );
}
