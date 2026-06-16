'use client';
import { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { slugify } from '@/lib/utils';
import type { Category, Product } from '@/types';

interface Props {
  product: Partial<Product>;
  categories: Category[];
  onClose: () => void;
  onSave: (p: Partial<Product>) => Promise<Product | null>;
}

export default function ProductForm({ product, categories, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    name: product.name ?? '',
    slug: product.slug ?? '',
    description: product.description ?? '',
    price: product.price ?? 0,
    original_price: product.original_price ?? 0,
    category_id: product.category_id ?? (categories[0]?.id ?? ''),
    stock_count: product.stock_count ?? 0,
    in_stock: product.in_stock ?? true,
    is_trending: product.is_trending ?? false,
    is_new_arrival: product.is_new_arrival ?? false,
    is_best_seller: product.is_best_seller ?? false,
    images: product.images ?? [],
    tags: product.tags ?? [],
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Upload failed');
        return;
      }
      setForm((f) => ({ ...f, images: [...f.images, data.url] }));
      toast.success('Image uploaded');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (form.images.length === 0) {
      toast.error('At least one image is required');
      return;
    }
    setSaving(true);
    try {
      const slug = form.slug.trim() || slugify(form.name);
      const data = {
        ...(product.id ? { id: product.id } : {}),
        ...form,
        slug,
        price: Number(form.price),
        original_price: Number(form.original_price),
        stock_count: Number(form.stock_count),
      };
      const saved = await onSave(data);
      if (saved) onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{product.id ? 'Edit product' : 'New product'}</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-neutral-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Name *">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Slug">
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="auto-generated from name"
                className="input"
              />
            </Field>
            <Field label="Category">
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="input"
              >
                <option value="">— Select —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Description *">
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input resize-none"
            />
          </Field>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Price (₹) *">
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                className="input"
              />
            </Field>
            <Field label="MRP (₹) *">
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={form.original_price}
                onChange={(e) => setForm({ ...form, original_price: parseFloat(e.target.value) || 0 })}
                className="input"
              />
            </Field>
            <Field label="Stock">
              <input
                type="number"
                min={0}
                value={form.stock_count}
                onChange={(e) => setForm({ ...form, stock_count: parseInt(e.target.value, 10) || 0 })}
                className="input"
              />
            </Field>
          </div>
          <Field label="Images *">
            <div className="flex flex-wrap gap-2">
              {form.images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-neutral-100 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, images: form.images.filter((_, j) => j !== i) })}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-neutral-200 hover:border-gold-400 hover:bg-gold-50 transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer text-neutral-500">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span className="text-[10px]">Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f);
                  }}
                />
              </label>
            </div>
          </Field>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.in_stock} onChange={(e) => setForm({ ...form, in_stock: e.target.checked })} />
              In stock
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_trending} onChange={(e) => setForm({ ...form, is_trending: e.target.checked })} />
              Trending
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_new_arrival} onChange={(e) => setForm({ ...form, is_new_arrival: e.target.checked })} />
              New arrival
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_best_seller} onChange={(e) => setForm({ ...form, is_best_seller: e.target.checked })} />
              Best seller
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : product.id ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </form>

      <style jsx>{`
        .input { width: 100%; padding: 0.625rem 0.875rem; border-radius: 0.75rem; border: 1px solid #e5e5e5; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: #d4882e; box-shadow: 0 0 0 2px #faecd5; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-neutral-500 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
