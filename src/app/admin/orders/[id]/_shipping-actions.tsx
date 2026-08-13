'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

export function ShippingPrepareForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    weightGrams: '',
    lengthCm: '',
    widthCm: '',
    heightCm: '',
  });

  function setField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function asPositiveNumber(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  async function submit() {
    const weightGrams = asPositiveNumber(form.weightGrams);
    const lengthCm = asPositiveNumber(form.lengthCm);
    const widthCm = asPositiveNumber(form.widthCm);
    const heightCm = asPositiveNumber(form.heightCm);

    if (!weightGrams || !lengthCm || !widthCm || !heightCm) {
      toast.error('Enter positive package weight and dimensions.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/shipping/prepare', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          idempotency_key: `admin-pack:${orderId}:${crypto.randomUUID()}`,
          package: {
            weightGrams,
            lengthCm,
            widthCm,
            heightCm,
          },
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(result?.message ?? result?.error ?? 'Package details could not be saved.');
        return;
      }

      toast.success('Package details saved.');
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-stone-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase text-neutral-500">Package details</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-neutral-600">
          Weight (grams)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.weightGrams}
            onChange={(event) => setField('weightGrams', event.target.value)}
            className="mt-1 min-h-10 w-full rounded-lg border border-stone-200 px-3 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-neutral-600">
          Length (cm)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.lengthCm}
            onChange={(event) => setField('lengthCm', event.target.value)}
            className="mt-1 min-h-10 w-full rounded-lg border border-stone-200 px-3 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-neutral-600">
          Width (cm)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.widthCm}
            onChange={(event) => setField('widthCm', event.target.value)}
            className="mt-1 min-h-10 w-full rounded-lg border border-stone-200 px-3 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-neutral-600">
          Height (cm)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.heightCm}
            onChange={(event) => setField('heightCm', event.target.value)}
            className="mt-1 min-h-10 w-full rounded-lg border border-stone-200 px-3 text-sm"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => void submit()}
        className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-neutral-950 px-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        <Save className="h-4 w-4" aria-hidden="true" />
        Save package details
      </button>
    </div>
  );
}
