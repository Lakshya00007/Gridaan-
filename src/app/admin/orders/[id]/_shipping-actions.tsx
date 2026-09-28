'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import type { CourierQuote } from '@/lib/shipping/types';

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

export function ShippingLiveActions({ shipmentId, status, enabled, awb }: {
  shipmentId: string;
  status: string;
  enabled: boolean;
  awb: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rates, setRates] = useState<CourierQuote[]>([]);
  const [selectedId, setSelectedId] = useState('');

  async function post(path: string, body: Record<string, unknown>) {
    setBusy(true);
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? 'NimbusPost request failed.');
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'NimbusPost request failed.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function loadRates() {
    const result = await post('/api/admin/shipping/rates', { shipment_id: shipmentId });
    if (!result) return;
    const next = result.rates as CourierQuote[];
    setRates(next);
    setSelectedId(next[0]?.courierId ?? '');
    if (!next.length) toast.error('No prepaid courier is available for this package and destination.');
  }

  async function book() {
    const selected = rates.find((rate) => rate.courierId === selectedId);
    if (!selected) return;
    if (!window.confirm(`Book ${selected.courierName} for ₹${selected.totalCharge.toFixed(2)}? This may charge your NimbusPost wallet.`)) return;
    const result = await post('/api/admin/shipping/book', {
      shipment_id: shipmentId,
      courier_id: selected.courierId,
      maximum_charge: selected.totalCharge,
    });
    if (!result) return;
    toast.success('NimbusPost shipment booked.');
    router.refresh();
  }

  async function sync() {
    const result = await post('/api/admin/shipping/sync', { shipment_id: shipmentId });
    if (!result) return;
    toast.success('Tracking updated.');
    router.refresh();
  }

  if (!enabled) return null;
  return (
    <div className="mt-4 space-y-3 rounded-lg border border-stone-200 bg-white p-3 text-sm">
      {status === 'ready_to_ship' ? (
        <>
          <button type="button" disabled={busy} onClick={() => void loadRates()} className="min-h-10 rounded-lg border border-stone-300 px-3 font-semibold disabled:opacity-60">Get prepaid courier rates</button>
          {rates.length ? (
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-medium text-neutral-600">Courier
                <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-1 block min-h-10 rounded-lg border border-stone-200 px-3 text-sm">
                  {rates.map((rate) => <option key={rate.courierId} value={rate.courierId}>{rate.courierName} · ₹{rate.totalCharge.toFixed(2)}</option>)}
                </select>
              </label>
              <button type="button" disabled={busy || !selectedId} onClick={() => void book()} className="min-h-10 rounded-lg bg-neutral-950 px-3 font-semibold text-white disabled:opacity-60">Book shipment</button>
            </div>
          ) : null}
        </>
      ) : null}
      {awb ? <button type="button" disabled={busy} onClick={() => void sync()} className="min-h-10 rounded-lg border border-stone-300 px-3 font-semibold disabled:opacity-60">Sync tracking</button> : null}
      {status === 'booking_uncertain' ? <p className="text-amber-800">Booking outcome is uncertain. Check the NimbusPost seller panel before taking further action.</p> : null}
    </div>
  );
}
