'use client';
import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { slugify } from '@/lib/utils';
import type { Category } from '@/types';

export default function CategoriesAdmin({ categories: initial }: { categories: Category[] }) {
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<Partial<Category> | null>(null);

  async function handleSave(cat: Partial<Category>) {
    const isUpdate = !!cat.id;
    const url = isUpdate ? `/api/admin/categories/${cat.id}` : '/api/admin/categories';
    const res = await fetch(url, {
      method: isUpdate ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cat),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? 'Failed');
      return;
    }
    if (isUpdate) setList(list.map((c) => (c.id === cat.id ? data.category : c)));
    else setList([...list, data.category].sort((a, b) => a.sort_order - b.sort_order));
    setEditing(null);
    toast.success(isUpdate ? 'Category updated' : 'Category created');
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category?')) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Failed to delete');
      return;
    }
    setList(list.filter((c) => c.id !== id));
    toast.success('Category deleted');
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Categories</h1>
          <p className="text-sm text-neutral-500">{list.length} total</p>
        </div>
        <button
          onClick={() => setEditing({ is_active: true, sort_order: list.length + 1 })}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> Add category
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold-50 flex items-center justify-center text-xl">
                  {c.icon || '📦'}
                </div>
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-neutral-400">/{c.slug}</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                  c.is_active ? 'bg-green-100 text-green-700' : 'bg-neutral-200 text-neutral-600'
                }`}
              >
                {c.is_active ? 'Active' : 'Hidden'}
              </span>
            </div>
            {c.description && <p className="text-xs text-neutral-500 mb-3 line-clamp-2">{c.description}</p>}
            <div className="flex gap-1 justify-end">
              <button
                onClick={() => setEditing(c)}
                className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && <CategoryForm category={editing} onClose={() => setEditing(null)} onSave={handleSave} />}
    </div>
  );
}

function CategoryForm({
  category,
  onClose,
  onSave,
}: {
  category: Partial<Category>;
  onClose: () => void;
  onSave: (c: Partial<Category>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: category.name ?? '',
    slug: category.slug ?? '',
    description: category.description ?? '',
    icon: category.icon ?? '',
    image_url: category.image_url ?? '',
    is_active: category.is_active ?? true,
    sort_order: category.sort_order ?? 0,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const slug = form.slug || slugify(form.name);
      await onSave({ ...category, ...form, slug });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-8 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{category.id ? 'Edit' : 'New'} category</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-neutral-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3">
          <Field label="Name *">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </Field>
          <Field label="Slug">
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto" className="input" />
          </Field>
          <Field label="Icon (emoji)">
            <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} maxLength={4} className="input" />
          </Field>
          <Field label="Description">
            <textarea rows={2} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input resize-none" />
          </Field>
          <Field label="Image URL">
            <input value={form.image_url ?? ''} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sort order">
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value, 10) || 0 })} className="input" />
            </Field>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </button>
        </div>
        <style jsx>{`
          .input { width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.75rem; border: 1px solid #e5e5e5; font-size: 0.875rem; outline: none; }
          .input:focus { border-color: #d4882e; box-shadow: 0 0 0 2px #faecd5; }
        `}</style>
      </form>
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
