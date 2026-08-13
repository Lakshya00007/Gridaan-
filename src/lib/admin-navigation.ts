import {
  BarChart3,
  Bell,
  Boxes,
  ClipboardList,
  CreditCard,
  FileClock,
  Gift,
  LayoutDashboard,
  Package,
  Percent,
  Settings,
  Star,
  Tags,
  Truck,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { AdminRole } from '@/types';
import { hasPermission, type AdminPermission } from '@/lib/admin/permissions-core';

export type AdminNavigationStatus = 'active' | 'read_only' | 'hidden';
export type AdminNavigationSection = 'Overview' | 'Commerce' | 'Finance' | 'Catalog' | 'Insights' | 'System';

export type AdminNavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: AdminPermission;
  requiredRoles: AdminRole[];
  featureStatus: AdminNavigationStatus;
  section: AdminNavigationSection;
};

const ALL_ROLES: AdminRole[] = [
  'owner',
  'admin',
  'operations',
  'inventory_manager',
  'support',
  'analyst',
  'viewer',
];

export const adminNavigation: AdminNavigationItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, permission: 'dashboard.read', requiredRoles: ALL_ROLES, featureStatus: 'active', section: 'Overview' },
  { label: 'Orders', href: '/admin/orders', icon: ClipboardList, permission: 'orders.read', requiredRoles: ['owner', 'admin', 'operations', 'support', 'analyst', 'viewer'], featureStatus: 'active', section: 'Commerce' },
  { label: 'Shipping', href: '/admin/shipping', icon: Truck, permission: 'shipping.read', requiredRoles: ['owner', 'admin', 'operations', 'support', 'analyst', 'viewer'], featureStatus: 'active', section: 'Commerce' },
  { label: 'Products', href: '/admin/products', icon: Package, permission: 'products.read', requiredRoles: ['owner', 'admin', 'inventory_manager', 'analyst', 'viewer'], featureStatus: 'active', section: 'Commerce' },
  { label: 'Inventory', href: '/admin/inventory', icon: Boxes, permission: 'inventory.read', requiredRoles: ['owner', 'admin', 'operations', 'inventory_manager', 'viewer'], featureStatus: 'read_only', section: 'Commerce' },
  { label: 'Customers', href: '/admin/customers', icon: Users, permission: 'customers.read', requiredRoles: ['owner', 'admin', 'operations', 'support', 'analyst', 'viewer'], featureStatus: 'read_only', section: 'Commerce' },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard, permission: 'payments.read', requiredRoles: ['owner', 'admin', 'operations', 'support', 'analyst', 'viewer'], featureStatus: 'read_only', section: 'Finance' },
  { label: 'Refunds', href: '/admin/refunds', icon: ClipboardList, permission: 'refunds.read', requiredRoles: ['owner', 'admin', 'operations', 'support', 'viewer'], featureStatus: 'read_only', section: 'Finance' },
  { label: 'Offers & Coupons', href: '/admin/offers', icon: Percent, permission: 'coupons.read', requiredRoles: ['owner', 'admin', 'viewer'], featureStatus: 'hidden', section: 'Catalog' },
  { label: 'Loyalty Program', href: '/admin/loyalty', icon: Gift, permission: 'loyalty.read', requiredRoles: ['owner', 'admin', 'viewer'], featureStatus: 'hidden', section: 'Commerce' },
  { label: 'Reports & Analytics', href: '/admin/reports', icon: BarChart3, permission: 'reports.read', requiredRoles: ['owner', 'admin', 'inventory_manager', 'analyst', 'viewer'], featureStatus: 'active', section: 'Insights' },
  { label: 'Categories', href: '/admin/categories', icon: Tags, permission: 'categories.read', requiredRoles: ['owner', 'admin', 'inventory_manager', 'viewer'], featureStatus: 'active', section: 'Catalog' },
  { label: 'Reviews', href: '/admin/reviews', icon: Star, permission: 'reviews.read', requiredRoles: ['owner', 'admin', 'viewer'], featureStatus: 'hidden', section: 'Catalog' },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell, permission: 'notifications.read', requiredRoles: ['owner', 'admin', 'operations', 'support', 'viewer'], featureStatus: 'read_only', section: 'System' },
  { label: 'Settings', href: '/admin/settings', icon: Settings, permission: 'settings.read', requiredRoles: ['owner', 'admin', 'viewer'], featureStatus: 'hidden', section: 'System' },
  { label: 'Admin Users & Roles', href: '/admin/users', icon: UserCog, permission: 'admin_users.read', requiredRoles: ['owner', 'admin', 'viewer'], featureStatus: 'hidden', section: 'System' },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileClock, permission: 'audit_logs.read', requiredRoles: ['owner', 'admin', 'viewer'], featureStatus: 'read_only', section: 'System' },
];

export function getVisibleAdminNavigation({
  role,
  explicitPermissions = [],
  legacyIsAdmin = false,
}: {
  role: AdminRole;
  explicitPermissions?: string[];
  legacyIsAdmin?: boolean;
}) {
  return adminNavigation.filter(
    (item) =>
      item.featureStatus !== 'hidden' &&
      hasPermission({
        role,
        explicitPermissions,
        permission: item.permission,
        legacyIsAdmin,
      })
  );
}

export function isAdminRouteActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === '/admin') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getAdminRouteLabel(pathname: string | null) {
  const match = adminNavigation
    .filter((item) => item.featureStatus !== 'hidden' && isAdminRouteActive(pathname, item.href))
    .sort((left, right) => right.href.length - left.href.length)[0];
  return match?.label ?? 'Admin';
}
