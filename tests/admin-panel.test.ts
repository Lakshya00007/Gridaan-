import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  adminNavigation,
  getVisibleAdminNavigation,
  isAdminRouteActive,
} from '@/lib/admin-navigation';
import { getVerifiedPlacedOrders, isVerifiedPlacedOrder } from '@/lib/admin/metrics';
import { validateAdminOrderTransition } from '@/lib/admin/order-transitions';

const projectRoot = path.resolve(import.meta.dirname, '..');

function read(relativePath: string) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function walkFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = path.join(directory, entry);
    return statSync(absolute).isDirectory() ? walkFiles(absolute) : [absolute];
  });
}

describe('admin route layout isolation', () => {
  it('keeps storefront chrome out of the root and admin layouts', () => {
    const rootLayout = read('src/app/layout.tsx');
    const adminLayout = read('src/app/admin/layout.tsx');
    const storefrontLayout = read('src/app/(storefront)/layout.tsx');

    for (const component of ['Header', 'Footer', 'WhatsAppButton', 'CartDrawer']) {
      expect(rootLayout).not.toContain(component);
      expect(adminLayout).not.toContain(component);
      expect(storefrontLayout).toContain(component);
    }
    expect(adminLayout).toContain('AdminShell');
  });

  it('provides dedicated loading, error and permission-denied states', () => {
    expect(read('src/app/admin/loading.tsx')).toContain('SkeletonRows');
    expect(read('src/app/admin/error.tsx')).toContain('AdminErrorState');
    expect(read('src/app/admin/forbidden/page.tsx')).toContain('Permission required');
    expect(read('src/app/admin/_components/ui.tsx')).toContain('No data yet');
  });
});

describe('admin navigation', () => {
  it('shows only audited functional modules and every visible route exists', () => {
    const visible = getVisibleAdminNavigation({ role: 'owner' });

    expect(visible.every((item) => item.featureStatus !== 'hidden')).toBe(true);
    expect(visible.map((item) => item.label)).not.toEqual(
      expect.arrayContaining(['Offers & Coupons', 'Loyalty Program', 'Reviews', 'Settings', 'Admin Users & Roles'])
    );

    for (const item of visible) {
      const routeFile = item.href === '/admin'
        ? 'src/app/admin/page.tsx'
        : `src/app${item.href}/page.tsx`;
      expect(() => read(routeFile), `${item.href} must have a page`).not.toThrow();
    }
  });

  it('marks exact and nested routes active without marking dashboard globally active', () => {
    expect(isAdminRouteActive('/admin', '/admin')).toBe(true);
    expect(isAdminRouteActive('/admin/orders/123', '/admin/orders')).toBe(true);
    expect(isAdminRouteActive('/admin/orders', '/admin')).toBe(false);
    expect(isAdminRouteActive('/admin/products', '/admin/orders')).toBe(false);
  });

  it('limits navigation by role permissions', () => {
    const support = getVisibleAdminNavigation({ role: 'support' }).map((item) => item.label);
    const inventory = getVisibleAdminNavigation({ role: 'inventory_manager' }).map((item) => item.label);

    expect(support).toContain('Orders');
    expect(support).toContain('Customers');
    expect(support).not.toContain('Products');
    expect(inventory).toContain('Products');
    expect(inventory).toContain('Categories');
    expect(inventory).not.toContain('Payments');
  });

  it('uses an accessible Radix drawer with overlay and close controls on mobile', () => {
    const shell = read('src/app/admin/_shell.tsx');
    expect(shell).toContain('<Dialog.Trigger asChild>');
    expect(shell).toContain('<Dialog.Overlay');
    expect(shell).toContain('<Dialog.Close asChild>');
    expect(shell).toContain('aria-label="Open admin navigation"');
  });

  it('keeps every audited module represented in the typed configuration', () => {
    expect(adminNavigation).toHaveLength(16);
    expect(new Set(adminNavigation.map((item) => item.href)).size).toBe(16);
  });
});

describe('admin commerce safety', () => {
  it('excludes unverified, pending and test orders from verified metrics', () => {
    const records = [
      { id: 'captured', is_test: false, payment_status: 'captured', order_status: 'placed' },
      { id: 'refunded', is_test: false, payment_status: 'refunded', order_status: 'delivered' },
      { id: 'failed', is_test: false, payment_status: 'failed', order_status: 'pending_payment' },
      { id: 'test', is_test: true, payment_status: 'captured', order_status: 'placed' },
      { id: 'pending', is_test: false, payment_status: 'captured', order_status: 'payment_processing' },
    ] as const;

    expect(getVerifiedPlacedOrders([...records]).map((record) => record.id)).toEqual(['captured', 'refunded']);
    expect(isVerifiedPlacedOrder(records[2])).toBe(false);
  });

  it('allows only sequential admin transitions after captured payment', () => {
    expect(validateAdminOrderTransition({ currentStatus: 'placed', nextStatus: 'confirmed', paymentStatus: 'captured' })).toEqual({ allowed: true });
    expect(validateAdminOrderTransition({ currentStatus: 'placed', nextStatus: 'confirmed', paymentStatus: 'pending' })).toMatchObject({ allowed: false, code: 'payment_verification_required' });
    expect(validateAdminOrderTransition({ currentStatus: 'pending_payment', nextStatus: 'placed', paymentStatus: 'captured' })).toMatchObject({ allowed: false, code: 'payment_controlled_status' });
    expect(validateAdminOrderTransition({ currentStatus: 'placed', nextStatus: 'shipped', paymentStatus: 'captured' })).toMatchObject({ allowed: false, code: 'invalid_status_transition' });
  });

  it('keeps payment and order mutation endpoints server protected', () => {
    const refundApi = read('src/app/api/payments/refund/route.ts');
    const orderApi = read('src/app/api/admin/orders/[id]/route.ts');

    expect(refundApi).toContain("requireAdminPermission('refunds.write')");
    expect(orderApi).toContain("requireAdminPermission('orders.write')");
    expect(orderApi).toContain('validateAdminOrderTransition');
    expect(orderApi).not.toMatch(/payment_status\s*:\s*z\./);
  });

  it('does not import the service-role client from client modules', () => {
    const clientFiles = walkFiles(path.join(projectRoot, 'src')).filter((file) => {
      if (!/\.(ts|tsx)$/.test(file)) return false;
      return readFileSync(file, 'utf8').trimStart().startsWith("'use client'");
    });

    for (const file of clientFiles) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(source, file).not.toContain('createServiceClient');
      expect(source, file).not.toContain('@/lib/env.server');
    }
  });
});
