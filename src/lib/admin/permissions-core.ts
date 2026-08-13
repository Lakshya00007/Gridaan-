import type { AdminRole } from '@/types';

export type AdminPermission =
  | 'dashboard.read'
  | 'orders.read'
  | 'orders.write'
  | 'shipping.read'
  | 'shipping.write'
  | 'shipping.cancel'
  | 'products.read'
  | 'products.write'
  | 'inventory.read'
  | 'inventory.write'
  | 'customers.read'
  | 'customers.write'
  | 'payments.read'
  | 'payments.write'
  | 'refunds.read'
  | 'refunds.write'
  | 'coupons.read'
  | 'coupons.write'
  | 'loyalty.read'
  | 'loyalty.write'
  | 'reports.read'
  | 'categories.read'
  | 'categories.write'
  | 'reviews.read'
  | 'reviews.write'
  | 'notifications.read'
  | 'notifications.write'
  | 'settings.read'
  | 'settings.write'
  | 'admin_users.read'
  | 'admin_users.write'
  | 'audit_logs.read';

const allPermissions: AdminPermission[] = [
  'dashboard.read',
  'orders.read',
  'orders.write',
  'shipping.read',
  'shipping.write',
  'shipping.cancel',
  'products.read',
  'products.write',
  'inventory.read',
  'inventory.write',
  'customers.read',
  'customers.write',
  'payments.read',
  'payments.write',
  'refunds.read',
  'refunds.write',
  'coupons.read',
  'coupons.write',
  'loyalty.read',
  'loyalty.write',
  'reports.read',
  'categories.read',
  'categories.write',
  'reviews.read',
  'reviews.write',
  'notifications.read',
  'notifications.write',
  'settings.read',
  'settings.write',
  'admin_users.read',
  'admin_users.write',
  'audit_logs.read',
];

export const rolePermissions: Record<AdminRole, AdminPermission[]> = {
  owner: allPermissions,
  admin: allPermissions.filter((permission) => permission !== 'admin_users.write'),
  operations: [
    'dashboard.read',
    'orders.read',
    'orders.write',
    'shipping.read',
    'shipping.write',
    'shipping.cancel',
    'inventory.read',
    'customers.read',
    'payments.read',
    'refunds.read',
    'refunds.write',
    'notifications.read',
  ],
  inventory_manager: [
    'dashboard.read',
    'products.read',
    'products.write',
    'inventory.read',
    'inventory.write',
    'categories.read',
    'categories.write',
    'reports.read',
  ],
  support: [
    'dashboard.read',
    'orders.read',
    'shipping.read',
    'customers.read',
    'customers.write',
    'payments.read',
    'refunds.read',
    'refunds.write',
    'notifications.read',
  ],
  analyst: ['dashboard.read', 'reports.read', 'orders.read', 'shipping.read', 'products.read', 'customers.read', 'payments.read'],
  viewer: [
    'dashboard.read',
    'orders.read',
    'shipping.read',
    'products.read',
    'inventory.read',
    'customers.read',
    'payments.read',
    'refunds.read',
    'coupons.read',
    'loyalty.read',
    'reports.read',
    'categories.read',
    'reviews.read',
    'notifications.read',
    'settings.read',
    'admin_users.read',
    'audit_logs.read',
  ],
};

export function hasPermission({
  role,
  explicitPermissions = [],
  permission,
  legacyIsAdmin = false,
}: {
  role?: AdminRole | null;
  explicitPermissions?: string[];
  permission: AdminPermission;
  legacyIsAdmin?: boolean;
}) {
  if (legacyIsAdmin) return true;
  if (!role) return false;
  if (role === 'owner') return true;
  return rolePermissions[role].includes(permission) || explicitPermissions.includes(permission);
}
