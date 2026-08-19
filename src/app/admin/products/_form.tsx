'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Star, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { slugify } from '@/lib/utils';
import type { Category, Product } from '@/types';

interface Props {
  product: Partial<Product>;
  categories: Category[];
  onClose: () => void;
  onSave: (p: Partial<Product>) => Promise<Product | null>;
}

type ImageMeta = {
  url: string;
  alt?: string;
  is_primary?: boolean;
};

type UploadResponse = {
  url?: string;
  product_id?: string;
  error?: string;
  code?: string;
};

export default function ProductForm({ product, categories, onClose, onSave }: Props) {
  const initialImageMeta = useMemo<ImageMeta[]>(() => {
    const existing = product.image_metadata ?? [];
    const byUrl = new Map(existing.map((item) => [item.url, item]));
    return (product.images ?? []).map((url, index) => ({
      url,
      alt: byUrl.get(url)?.alt ?? product.name ?? '',
      is_primary: index === 0,
    }));
  }, [product.image_metadata, product.images, product.name]);

  const [form, setForm] = useState({
    name: product.name ?? '',
    slug: product.slug ?? '',
    sku: product.sku ?? '',
    short_description: product.short_description ?? '',
    description: product.description ?? '',
    price: product.price ?? 0,
    original_price: product.original_price ?? 0,
    cost_price: product.cost_price ?? 0,
    category_id: product.category_id ?? (categories[0]?.id ?? ''),
    subcategory: product.subcategory ?? '',
    product_type: product.product_type ?? '',
    gender: product.gender ?? '',
    material: product.material ?? '',
    colour: product.colour ?? '',
    size: product.size ?? '',
    weight_grams: product.weight_grams ?? 0,
    jewellery_type: product.jewellery_type ?? '',
    stock_count: product.stock_count ?? 0,
    reserved_stock: product.reserved_stock ?? 0,
    low_stock_threshold: product.low_stock_threshold ?? 5,
    reorder_level: product.reorder_level ?? 0,
    in_stock: product.in_stock ?? true,
    is_trending: product.is_trending ?? false,
    is_new_arrival: product.is_new_arrival ?? false,
    is_best_seller: product.is_best_seller ?? false,
    is_featured: product.is_featured ?? false,
    is_active: product.is_active ?? true,
    return_eligible: product.return_eligible ?? true,
    cod_eligible: false,
    images: product.images ?? [],
    image_metadata: initialImageMeta,
    tags_text: (product.tags ?? []).join(', '),
    seo_title: product.seo_title ?? '',
    seo_description: product.seo_description ?? '',
    search_keywords_text: (product.search_keywords ?? []).join(', '),
  });
  const initialImageUrls = useMemo(() => new Set(product.images ?? []), [product.images]);
  const [mediaProductId, setMediaProductId] = useState(product.id ?? null);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  function setImageList(nextImages: string[], nextMeta = form.image_metadata) {
    setForm((current) => ({
      ...current,
      images: nextImages,
      image_metadata: nextImages.map((url, index) => ({
        ...(nextMeta.find((item) => item.url === url) ?? { url, alt: current.name }),
        url,
        is_primary: index === 0,
      })),
    }));
  }

  async function requestDeleteUploadedImages(urls: string[]) {
    if (urls.length === 0) return;
    await fetch('/api/admin/upload', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ urls }),
    }).catch(() => null);
  }

  async function cleanupUnsavedUploads(urls = uploadedImageUrls) {
    const safeUrls = urls.filter((url) => !initialImageUrls.has(url));
    if (safeUrls.length === 0) return;
    setUploadedImageUrls((current) => current.filter((url) => !safeUrls.includes(url)));
    await requestDeleteUploadedImages(safeUrls);
  }

  function handleClose() {
    void cleanupUnsavedUploads();
    onClose();
  }

  function moveImage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= form.images.length) return;
    const next = [...form.images];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setImageList(next);
  }

  function removeImage(url: string) {
    setImageList(form.images.filter((imageUrl) => imageUrl !== url));
    if (uploadedImageUrls.includes(url) && !initialImageUrls.has(url)) {
      setUploadedImageUrls((current) => current.filter((imageUrl) => imageUrl !== url));
      void requestDeleteUploadedImages([url]);
    }
  }

  async function handleImageUpload(files: File[]) {
    if (files.length === 0) return;
    setUploading(true);
    const uploadedUrls: string[] = [];
    let nextProductId = mediaProductId;

    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        if (nextProductId) fd.append('product_id', nextProductId);

        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        const data = (await res.json()) as UploadResponse;
        if (!res.ok || !data.url || !data.product_id) {
          throw new Error(data.error ?? 'Upload failed');
        }

        nextProductId = data.product_id;
        uploadedUrls.push(data.url);
      }

      setMediaProductId(nextProductId);
      setUploadedImageUrls((current) => [...current, ...uploadedUrls]);
      setForm((current) => ({
        ...current,
        images: [...current.images, ...uploadedUrls],
        image_metadata: [
          ...current.image_metadata,
          ...uploadedUrls.map((url, index) => ({
            url,
            alt: current.name,
            is_primary: current.images.length + index === 0,
          })),
        ],
      }));
      toast.success(uploadedUrls.length === 1 ? 'Image uploaded' : 'Images uploaded');
    } catch (error) {
      await requestDeleteUploadedImages(uploadedUrls);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
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
        ...(product.id || mediaProductId ? { id: product.id ?? mediaProductId ?? undefined } : {}),
        name: form.name,
        slug,
        sku: form.sku || null,
        short_description: form.short_description || null,
        description: form.description,
        price: Number(form.price),
        original_price: Number(form.original_price),
        cost_price: form.cost_price ? Number(form.cost_price) : null,
        category_id: form.category_id || null,
        subcategory: form.subcategory || null,
        product_type: form.product_type || null,
        gender: form.gender || null,
        material: form.material || null,
        colour: form.colour || null,
        size: form.size || null,
        weight_grams: form.weight_grams ? Number(form.weight_grams) : null,
        jewellery_type: form.jewellery_type || null,
        stock_count: Number(form.stock_count),
        reserved_stock: Number(form.reserved_stock),
        low_stock_threshold: Number(form.low_stock_threshold),
        reorder_level: Number(form.reorder_level),
        in_stock: form.in_stock,
        is_trending: form.is_trending,
        is_new_arrival: form.is_new_arrival,
        is_best_seller: form.is_best_seller,
        is_featured: form.is_featured,
        is_active: form.is_active,
        return_eligible: form.return_eligible,
        cod_eligible: false,
        images: form.images,
        image_metadata: form.image_metadata,
        tags: splitList(form.tags_text),
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
        search_keywords: splitList(form.search_keywords_text),
      };
      const saved = await onSave(data);
      if (saved) {
        onClose();
      } else {
        await cleanupUnsavedUploads();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={handleClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="my-8 w-full max-w-5xl rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{product.id ? 'Edit product' : 'New product'}</h2>
            <p className="text-xs text-neutral-500">Catalogue, inventory, media, SEO and commerce eligibility</p>
          </div>
          <button type="button" onClick={handleClose} className="rounded-lg p-2 hover:bg-neutral-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-5">
            <Panel title="Core details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Product name *">
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
                </Field>
                <Field label="Slug">
                  <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated from name" className="input" />
                </Field>
                <Field label="SKU">
                  <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input" />
                </Field>
                <Field label="Category">
                  <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input">
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Short description" className="sm:col-span-2">
                  <textarea rows={2} value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} className="input resize-none" />
                </Field>
                <Field label="Full description *" className="sm:col-span-2">
                  <textarea required rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input resize-none" />
                </Field>
              </div>
            </Panel>

            <Panel title="Attributes">
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField label="Subcategory" value={form.subcategory} onChange={(value) => setForm({ ...form, subcategory: value })} />
                <TextField label="Product type" value={form.product_type} onChange={(value) => setForm({ ...form, product_type: value })} />
                <TextField label="Gender" value={form.gender} onChange={(value) => setForm({ ...form, gender: value })} />
                <TextField label="Material" value={form.material} onChange={(value) => setForm({ ...form, material: value })} />
                <TextField label="Colour" value={form.colour} onChange={(value) => setForm({ ...form, colour: value })} />
                <TextField label="Size" value={form.size} onChange={(value) => setForm({ ...form, size: value })} />
                <TextField label="Jewellery type" value={form.jewellery_type} onChange={(value) => setForm({ ...form, jewellery_type: value })} />
                <Field label="Weight (grams)">
                  <input type="number" min={0} step="0.01" value={form.weight_grams} onChange={(e) => setForm({ ...form, weight_grams: parseFloat(e.target.value) || 0 })} className="input" />
                </Field>
              </div>
            </Panel>

            <Panel title="SEO and search">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="SEO title" value={form.seo_title} onChange={(value) => setForm({ ...form, seo_title: value })} />
                <TextField label="Search keywords" value={form.search_keywords_text} onChange={(value) => setForm({ ...form, search_keywords_text: value })} placeholder="comma separated" />
                <Field label="SEO description" className="sm:col-span-2">
                  <textarea rows={2} value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} className="input resize-none" />
                </Field>
                <TextField label="Tags" value={form.tags_text} onChange={(value) => setForm({ ...form, tags_text: value })} placeholder="comma separated" />
              </div>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel title="Pricing">
              <div className="grid gap-3">
                <NumberField label="Selling price (Rs) *" value={form.price} onChange={(value) => setForm({ ...form, price: value })} />
                <NumberField label="MRP (Rs) *" value={form.original_price} onChange={(value) => setForm({ ...form, original_price: value })} />
                <NumberField label="Cost price" value={form.cost_price} onChange={(value) => setForm({ ...form, cost_price: value })} />
              </div>
            </Panel>

            <Panel title="Inventory">
              <div className="grid gap-3">
                <NumberField label="Current stock" integer value={form.stock_count} onChange={(value) => setForm({ ...form, stock_count: value })} />
                <NumberField label="Reserved stock" integer value={form.reserved_stock} onChange={(value) => setForm({ ...form, reserved_stock: value })} />
                <NumberField label="Low-stock threshold" integer value={form.low_stock_threshold} onChange={(value) => setForm({ ...form, low_stock_threshold: value })} />
                <NumberField label="Reorder level" integer value={form.reorder_level} onChange={(value) => setForm({ ...form, reorder_level: value })} />
              </div>
            </Panel>

            <Panel title="Images">
              <div className="space-y-3">
                {form.images.map((img, i) => {
                  const meta = form.image_metadata.find((item) => item.url === img);
                  return (
                    <div key={img} className="rounded-xl border border-neutral-200 p-2">
                      <div className="flex gap-3">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img} alt={meta?.alt ?? ''} className="h-full w-full object-cover" />
                          {i === 0 ? (
                            <span className="absolute left-1 top-1 rounded-full bg-gold-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                              Primary
                            </span>
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <input
                            value={meta?.alt ?? ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setForm((current) => ({
                                ...current,
                                image_metadata: current.image_metadata.map((item) => item.url === img ? { ...item, alt: value } : item),
                              }));
                            }}
                            placeholder="Alt text"
                            className="input"
                          />
                          <div className="flex flex-wrap gap-1">
                            <IconButton type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} label="Move up"><ArrowUp className="h-3.5 w-3.5" /></IconButton>
                            <IconButton type="button" onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1} label="Move down"><ArrowDown className="h-3.5 w-3.5" /></IconButton>
                            <IconButton type="button" onClick={() => setImageList([img, ...form.images.filter((url) => url !== img)])} disabled={i === 0} label="Make primary"><Star className="h-3.5 w-3.5" /></IconButton>
                            <IconButton type="button" onClick={() => removeImage(img)} label="Remove image"><X className="h-3.5 w-3.5" /></IconButton>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 text-neutral-500 transition hover:border-gold-400 hover:bg-gold-50">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                  <span className="text-xs font-medium">{uploading ? 'Uploading...' : 'Upload image'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      e.currentTarget.value = '';
                      void handleImageUpload(files);
                    }}
                  />
                </label>
              </div>
            </Panel>

            <Panel title="Commerce settings">
              <div className="grid gap-3 text-sm">
                <Toggle label="Active" checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} />
                <Toggle label="Featured" checked={form.is_featured} onChange={(value) => setForm({ ...form, is_featured: value })} />
                <Toggle label="In stock" checked={form.in_stock} onChange={(value) => setForm({ ...form, in_stock: value })} />
                <Toggle label="Trending" checked={form.is_trending} onChange={(value) => setForm({ ...form, is_trending: value })} />
                <Toggle label="New arrival" checked={form.is_new_arrival} onChange={(value) => setForm({ ...form, is_new_arrival: value })} />
                <Toggle label="Best seller" checked={form.is_best_seller} onChange={(value) => setForm({ ...form, is_best_seller: value })} />
                <Toggle label="Return eligible" checked={form.return_eligible} onChange={(value) => setForm({ ...form, return_eligible: value })} />
              </div>
            </Panel>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-neutral-100 pt-5">
          <button type="button" onClick={handleClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : product.id ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </form>
    </div>
  );
}

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-neutral-950">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-neutral-500">{label}</label>
      {children}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <Field label={label}>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input" />
    </Field>
  );
}

function NumberField({
  label,
  value,
  onChange,
  integer = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  integer?: boolean;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={0}
        step={integer ? 1 : 0.01}
        value={value}
        onChange={(e) => onChange(integer ? parseInt(e.target.value, 10) || 0 : parseFloat(e.target.value) || 0)}
        className="input"
      />
    </Field>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function IconButton({
  children,
  label,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      disabled={disabled}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition hover:border-gold-300 hover:text-neutral-950 disabled:opacity-40"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
