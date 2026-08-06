import 'server-only';

import { createServiceClient } from '@/lib/supabase/server';
import { getVerifiedPlacedOrders } from '@/lib/admin/metrics';
import type { Category, Coupon, Order, Product, RefundRecord } from '@/types';

type QueryResult = { data: unknown; error: { message: string } | null };

export async function safeAdminQuery<T>(label: string, query: PromiseLike<QueryResult>, fallback: T): Promise<T> {
  const { data, error } = await query;
  if (error) {
    console.warn(`[admin-module] ${label} failed`, error.message);
    throw new Error('Admin module data could not be loaded');
  }
  return (data as T) ?? fallback;
}

export async function getInventoryPageData() {
  const supabase = createServiceClient();
  const [products, movements] = await Promise.all([
    safeAdminQuery<Array<Product & { category?: Category | null }>>(
      'inventory-products',
      supabase.from('products').select('*, category:categories(*)').order('stock_count', { ascending: true }).limit(150),
      []
    ),
    safeAdminQuery<
      {
        adjustment_id: string;
        product_id: string;
        order_id: string | null;
        type: string;
        quantity_change: number;
        previous_quantity: number;
        new_quantity: number;
        reason: string;
        created_at: string;
      }[]
    >(
      'inventory-movements',
      supabase.from('inventory_movements').select('*').order('created_at', { ascending: false }).limit(50),
      []
    ),
  ]);

  return { products, movements };
}

export async function getCustomersPageData() {
  const supabase = createServiceClient();
  const [customers, profiles, orders] = await Promise.all([
    safeAdminQuery<
      {
        id: string;
        full_name: string | null;
        email: string | null;
        phone: string | null;
        status: string;
        tags: string[];
        total_orders: number;
        total_spent: number;
        average_order_value: number;
        last_order_at: string | null;
        created_at: string;
      }[]
    >('customers', supabase.from('customers').select('*').order('created_at', { ascending: false }).limit(100), []),
    safeAdminQuery<
      { id: string; full_name: string | null; email: string | null; phone: string | null; created_at: string }[]
    >('profiles-for-customers', supabase.from('profiles').select('id, full_name, email, phone, created_at').order('created_at', { ascending: false }).limit(100), []),
    safeAdminQuery<Order[]>('customer-orders', supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200), []),
  ]);

  const ordersByUser = new Map<string, Order[]>();
  for (const order of orders) {
    if (!order.user_id) continue;
    const current = ordersByUser.get(order.user_id) ?? [];
    current.push(order);
    ordersByUser.set(order.user_id, current);
  }

  const derived = profiles.map((profile) => {
    const matchingOrders = ordersByUser.get(profile.id) ?? [];
    const placedOrders = getVerifiedPlacedOrders(matchingOrders).filter(
      (order) => order.payment_status === 'captured'
    );
    const totalSpent = placedOrders
      .reduce((sum, order) => sum + Number(order.final_amount ?? order.total ?? 0), 0);
    return {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      status: totalSpent > 10000 ? 'high_value' : 'active',
      tags: [] as string[],
      total_orders: placedOrders.length,
      total_spent: totalSpent,
      average_order_value: placedOrders.length ? totalSpent / placedOrders.length : 0,
      last_order_at: placedOrders[0]?.created_at ?? null,
      created_at: profile.created_at,
    };
  });

  return { customers: customers.length ? customers : derived };
}

export async function getCouponsPageData() {
  const supabase = createServiceClient();
  const coupons = await safeAdminQuery<Coupon[]>(
    'coupons',
    supabase.from('coupons').select('*').order('created_at', { ascending: false }).limit(100),
    []
  );
  return { coupons };
}

export async function getReportsPageData() {
  const supabase = createServiceClient();
  const [orders, products, coupons, refunds] = await Promise.all([
    safeAdminQuery<Order[]>('reports-orders', supabase.from('orders').select('*, items:order_items(*)').order('created_at', { ascending: false }).limit(500), []),
    safeAdminQuery<Product[]>('reports-products', supabase.from('products').select('*').order('created_at', { ascending: false }).limit(200), []),
    safeAdminQuery<Coupon[]>('reports-coupons', supabase.from('coupons').select('*').order('created_at', { ascending: false }).limit(100), []),
    safeAdminQuery<RefundRecord[]>('reports-refunds', supabase.from('refunds').select('*').order('created_at', { ascending: false }).limit(500), []),
  ]);
  return { orders, products, coupons, refunds };
}

export async function getAuditPageData() {
  const supabase = createServiceClient();
  const logs = await safeAdminQuery<
    { id: string; admin_id: string | null; action: string; entity: string; entity_id: string | null; created_at: string; metadata?: Record<string, unknown> }[]
  >('audit-logs', supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(100), []);
  return { logs };
}

export async function getAdminUsersPageData() {
  const supabase = createServiceClient();
  const users = await safeAdminQuery<
    {
      user_id: string;
      role: string;
      permissions: string[];
      is_active: boolean;
      created_at: string;
      profile?: { email: string | null; full_name: string | null } | null;
    }[]
  >(
    'admin-users',
    supabase
      .from('admin_profiles')
      .select('*, profile:profiles(email, full_name)')
      .order('created_at', { ascending: false })
      .limit(100),
    []
  );
  return { users };
}

export async function getReviewsPageData() {
  const supabase = createServiceClient();
  const reviews = await safeAdminQuery<
    { id: string; rating: number; title: string | null; body: string | null; status: string; created_at: string; product?: Pick<Product, 'name'> | null }[]
  >(
    'reviews',
    supabase.from('product_reviews').select('*, product:products(name)').order('created_at', { ascending: false }).limit(100),
    []
  );
  return { reviews };
}

export async function getNotificationsPageData() {
  const supabase = createServiceClient();
  const notifications = await safeAdminQuery<
    { id: string; title: string; body: string | null; type: string; audience: string; read_at: string | null; created_at: string }[]
  >('notifications', supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100), []);
  return { notifications };
}

export async function getSettingsPageData() {
  const supabase = createServiceClient();
  const settings = await safeAdminQuery<
    { key: string; section: string; value: Record<string, unknown>; updated_at: string; is_secret: boolean }[]
  >('store-settings', supabase.from('store_settings').select('*').order('section').order('key'), []);
  return { settings };
}
