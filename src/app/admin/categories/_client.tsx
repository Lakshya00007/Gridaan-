'use client';
import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { slugify } from '@/lib/utils';
import type { Category } from '@/types';
import { AdminPageHeader, EmptyState } from '../_components/ui';
import { AdminConfirmDialog } from '../_components/confirm-dialog';

export default function CategoriesAdmin({ categories: initial }: { categories: Category[] }) {
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      <AdminPageHeader
        title="Categories"
        description={`${list.length.toLocaleString('en-IN')} catalog categories.`}
        action={
          <button
            onClick={() => setEditing({ is_active: true, sort_order: list.length + 1 })}
            className="btn-primary min-h-11"
          >
            <Plus className="w-4 h-4" /> Add category
          </button>
        }
      />

      {list.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <div key={c.id} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
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
                aria-label={`Edit ${c.name}`}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPendingDelete(c)}
                className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                aria-label={`Delete ${c.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div> : <EmptyState title="No categories" description="Create a category to organise the product catalog." />}

      {editing && <CategoryForm category={editing} onClose={() => setEditing(null)} onSave={handleSave} />}
      <AdminConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
        title="Delete category?"
        description={pendingDelete ? `${pendingDelete.name} will be permanently deleted. The server will reject deletion when products still reference it.` : ''}
        confirmLabel="Delete category"
        destructive
        busy={deleting}
        onConfirm={() => {
          if (!pendingDelete) return;
          setDeleting(true);
          void handleDelete(pendingDelete.id).finally(() => {
            setDeleting(false);
            setPendingDelete(null);
          });
        }}
      />
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
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-6 shadow-2xl outline-none focus-visible:ring-4 focus-visible:ring-gold-200">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between mb-4">
          <Dialog.Title className="text-lg font-semibold">{category.id ? 'Edit' : 'New'} category</Dialog.Title>
          <Dialog.Close asChild>
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-neutral-100" aria-label="Close category form">
            <X className="w-5 h-5" />
          </button>
          </Dialog.Close>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
