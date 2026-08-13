import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseServerFeatureFlag } from '@/lib/shipping/feature-flag';
import { validatePackageDetails } from '@/lib/shipping/package';
import { chooseCheapestEligibleCourier } from '@/lib/shipping/rates';
import { mapProviderStatusToCanonical, shouldApplyShipmentStatusUpdate } from '@/lib/shipping/status';
import type { CourierQuote } from '@/lib/shipping/types';

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('shipping feature flag', () => {
  it('is disabled unless explicitly set to true', () => {
    expect(parseServerFeatureFlag(undefined)).toBe(false);
    expect(parseServerFeatureFlag('false')).toBe(false);
    expect(parseServerFeatureFlag('TRUE')).toBe(true);
  });
});

describe('package validation', () => {
  it('requires real positive package measurements', () => {
    expect(
      validatePackageDetails({
        weightGrams: 0,
        lengthCm: 10,
        widthCm: 8,
        heightCm: 4,
      })
    ).toMatchObject({ ok: false });

    expect(
      validatePackageDetails({
        weightGrams: 128.5,
        lengthCm: 18,
        widthCm: 12,
        heightCm: 5,
      })
    ).toEqual({
      ok: true,
      packageDetails: {
        weightGrams: 128.5,
        lengthCm: 18,
        widthCm: 12,
        heightCm: 5,
      },
    });
  });
});

describe('courier quote selection', () => {
  const quotes: CourierQuote[] = [
    {
      provider: 'nimbuspost',
      courierId: 'cod-only',
      courierName: 'COD Carrier',
      paymentMode: 'cod',
      serviceable: true,
      enabled: true,
      totalCharge: 40,
      currency: 'INR',
    },
    {
      provider: 'nimbuspost',
      courierId: 'surface-b',
      courierName: 'Surface B',
      paymentMode: 'prepaid',
      serviceable: true,
      enabled: true,
      totalCharge: 65,
      currency: 'INR',
    },
    {
      provider: 'nimbuspost',
      courierId: 'surface-a',
      courierName: 'Surface A',
      paymentMode: 'prepaid',
      serviceable: true,
      enabled: true,
      totalCharge: 65,
      currency: 'INR',
    },
    {
      provider: 'nimbuspost',
      courierId: 'disabled',
      courierName: 'Disabled Carrier',
      paymentMode: 'prepaid',
      serviceable: true,
      enabled: false,
      totalCharge: 20,
      currency: 'INR',
    },
  ];

  it('recommends the deterministic cheapest eligible prepaid courier', () => {
    expect(chooseCheapestEligibleCourier(quotes)?.courierId).toBe('surface-a');
  });

  it('allows admin-configured courier exclusions', () => {
    expect(chooseCheapestEligibleCourier(quotes, { excludedCourierIds: ['surface-a'] })?.courierId).toBe('surface-b');
  });
});

describe('shipment status handling', () => {
  it('does not let out-of-order events regress shipment state', () => {
    expect(
      shouldApplyShipmentStatusUpdate({
        current: 'in_transit',
        next: 'booked',
      })
    ).toBe(false);

    expect(
      shouldApplyShipmentStatusUpdate({
        current: 'in_transit',
        next: 'out_for_delivery',
      })
    ).toBe(true);
  });

  it('does not map undocumented provider statuses', () => {
    expect(mapProviderStatusToCanonical('SHIPPED', {})).toBeNull();
  });
});

describe('shipping persistence and security guardrails', () => {
  it('uses an active-shipment unique index and service-role RPC lock', () => {
    const migration = read('supabase/migrations/20260814003000_add_shipping_subsystem.sql');
    expect(migration).toContain('shipments_one_active_outbound_per_order_idx');
    expect(migration).toContain('for update');
    expect(migration).toContain('Shipment requires captured Razorpay payment');
    expect(migration).not.toMatch(/payment_status\s*=/);
  });

  it('keeps NimbusPost credentials out of public environment names and provider code', () => {
    const envExample = read('.env.example');
    const providerClient = read('src/lib/shipping/providers/nimbuspost/client.ts');
    expect(envExample).not.toMatch(/^NEXT_PUBLIC_NIMBUSPOST/m);
    expect(providerClient).not.toMatch(/api\.nimbuspost|authorization|bearer/i);
  });
});
