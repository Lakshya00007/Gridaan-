import 'server-only';

import { createServiceClient } from '@/lib/supabase/server';
import { getVerifiedPlacedOrders } from '@/lib/admin/metrics';
import { formatDate } from '@/lib/utils';
import type { Order, OrderStatusHistory, PaymentRecord, Product, RefundRecord } from '@/types';

export type AdminAuditLogRecord = {
  id: string;
  admin_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

export type PaymentAttemptRecord = {
  id: string;
  order_id: string;
  payment_id: string | null;
  provider: string;
  idempotency_key: string;
  gateway_order_id: string | null;
  amount_paise: number;
  currency: string;
  status: string;
  error_code: string | null;
  error_message: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentWebhookEventRecord = {
  id: string;
  provider: string;
  event_id: string;
  event_type: string;
  payload_hash: string;
  payload: Record<string, unknown>;
  processed: boolean;
  processing_error: string | null;
  created_at: string;
  processed_at: string | null;
};

export type AdminOrderDetail = {
  order: Order;
  payments: PaymentRecord[];
  refunds: RefundRecord[];
  statusHistory: OrderStatusHistory[];
  auditLogs: AdminAuditLogRecord[];
};

export type AdminPaymentDetail = {
  payment: PaymentRecord & { order?: Order | null };
  attempts: PaymentAttemptRecord[];
  refunds: RefundRecord[];
  webhookEvents: PaymentWebhookEventRecord[];
  auditLogs: AdminAuditLogRecord[];
};

export type DashboardData = {
  generatedAt: string;
  range: DashboardRange;
  rangeLabel: string;
  metrics: {
    grossRevenue: number;
    netRevenue: number;
    totalOrders: number;
    paidOrders: number;
    pendingPayments: number;
    cancelledOrders: number;
    refundAmount: number;
    totalCustomers: number;
    newCustomers: number;
    activeProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    averageOrderValue: number;
  };
  revenueOverTime: { label: string; value: number }[];
  ordersOverTime: { label: string; value: number }[];
  paymentDistribution: { label: string; value: number }[];
  orderStatusDistribution: { label: string; value: number }[];
  topProducts: { label: string; value: number }[];
  lowStockProducts: Product[];
  recentOrders: Order[];
  pendingPaymentOrders: Order[];
  failedPayments: PaymentRecord[];
  pendingRefunds: RefundRecord[];
  recentCustomers: { id: string; full_name: string | null; email: string | null; phone: string | null; created_at: string }[];
  recentActivities: { id: string; action: string; entity: string; created_at: string }[];
};

export type DashboardRange = '24h' | '7d' | '30d';

async function safeQuery<T>(label: string, query: PromiseLike<{ data: unknown; error: { message: string } | null }>, fallback: T): Promise<T> {
  const { data, error } = await query;
  if (error) {
    console.warn(`[admin-data] ${label} failed`, error.message);
    throw new Error('Admin data could not be loaded');
  }
  return (data as T) ?? fallback;
}

async function safeCount(
  label: string,
  query: PromiseLike<{ count: number | null; error: { message: string } | null }>
) {
  const { count, error } = await query;
  if (error) {
    console.warn(`[admin-data] ${label} failed`, error.message);
    throw new Error('Admin metric could not be loaded');
  }
  return count ?? 0;
}

function numberValue(value: unknown) {
  return Number(value ?? 0);
}

function groupByDay(rows: { created_at: string; total?: number }[], valueKey?: 'total') {
  const map = new Map<string, number>();
  for (const row of rows) {
    const dateKey = row.created_at.slice(0, 10);
    map.set(dateKey, (map.get(dateKey) ?? 0) + (valueKey ? numberValue(row[valueKey]) : 1));
  }
  return Array.from(map.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-14)
    .map(([date, value]) => ({ label: formatDate(date), value }));
}

function groupBy(rows: Record<string, unknown>[], key: string) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const label = String(row[key] ?? 'unknown');
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
}

function getDashboardRange(range: DashboardRange) {
  const durationHours = range === '24h' ? 24 : range === '7d' ? 24 * 7 : 24 * 30;
  return {
    start: new Date(Date.now() - durationHours * 60 * 60 * 1000).toISOString(),
    label: range === '24h' ? 'Last 24 hours' : range === '7d' ? 'Last 7 days' : 'Last 30 days',
  };
}

export async function getDashboardData(range: DashboardRange = '30d'): Promise<DashboardData> {
  const supabase = createServiceClient();
  const selectedRange = getDashboardRange(range);
  const [orders, products, profiles, payments, refunds, activities, totalCustomers, newCustomers] = await Promise.all([
    safeQuery<Order[]>(
      'orders',
      supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .gte('created_at', selectedRange.start)
        .order('created_at', { ascending: false })
        .limit(1000),
      []
    ),
    safeQuery<Product[]>(
      'products',
      supabase.from('products').select('*, category:categories(*)').order('updated_at', { ascending: false }).limit(500),
      []
    ),
    safeQuery<{ id: string; full_name: string | null; email: string | null; phone: string | null; created_at: string }[]>(
      'profiles',
      supabase.from('profiles').select('id, full_name, email, phone, created_at').gte('created_at', selectedRange.start).order('created_at', { ascending: false }).limit(50),
      []
    ),
    safeQuery<PaymentRecord[]>(
      'payments',
      supabase.from('payments').select('*').gte('created_at', selectedRange.start).order('created_at', { ascending: false }).limit(500),
      []
    ),
    safeQuery<RefundRecord[]>(
      'refunds',
      supabase.from('refunds').select('*').gte('created_at', selectedRange.start).order('created_at', { ascending: false }).limit(500),
      []
    ),
    safeQuery<{ id: string; action: string; entity: string; created_at: string }[]>(
      'admin_audit_logs',
      supabase.from('admin_audit_logs').select('id, action, entity, created_at').order('created_at', { ascending: false }).limit(12),
      []
    ),
    safeCount('profiles-count', supabase.from('profiles').select('id', { count: 'exact', head: true })),
    safeCount(
      'new-profiles-count',
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', selectedRange.start)
    ),
  ]);

  const analyticsOrders = orders.filter((order) => order.is_test !== true);
  const placedOrders = getVerifiedPlacedOrders(analyticsOrders);
  const paidOrders = placedOrders;
  const grossRevenue = paidOrders.reduce((sum, order) => sum + numberValue(order.gross_amount ?? order.subtotal + order.discount), 0);
  const refundAmount = refunds
    .filter((refund) => refund.status === 'processed')
    .reduce((sum, refund) => sum + numberValue(refund.approved_amount_paise ?? refund.requested_amount_paise) / 100, 0);
  const netRevenue = paidOrders.reduce((sum, order) => sum + numberValue(order.final_amount ?? order.total), 0) - refundAmount;
  const activeProducts = products.filter((product) => product.is_active !== false && !product.archived_at).length;
  const lowStockProducts = products.filter((product) => {
    const stock = numberValue(product.stock_count);
    const reserved = numberValue(product.reserved_stock);
    const threshold = numberValue(product.low_stock_threshold ?? 5);
    return stock - reserved > 0 && stock - reserved <= threshold;
  });
  const outOfStockProducts = products.filter((product) => !product.in_stock || numberValue(product.stock_count) <= 0);
  const orderItems = paidOrders.flatMap((order) => order.items ?? []);
  const productSales = new Map<string, number>();
  for (const item of orderItems) {
    productSales.set(item.product_name, (productSales.get(item.product_name) ?? 0) + item.quantity);
  }

  return {
    generatedAt: new Date().toISOString(),
    range,
    rangeLabel: selectedRange.label,
    metrics: {
      grossRevenue,
      netRevenue: Math.max(0, netRevenue),
      totalOrders: placedOrders.length,
      paidOrders: paidOrders.length,
      pendingPayments: analyticsOrders.filter((order) => order.payment_status === 'pending' || order.payment_status === 'authorised').length,
      cancelledOrders: analyticsOrders.filter((order) => order.order_status === 'cancelled').length,
      refundAmount,
      totalCustomers,
      newCustomers,
      activeProducts,
      lowStockProducts: lowStockProducts.length,
      outOfStockProducts: outOfStockProducts.length,
      averageOrderValue: paidOrders.length
        ? paidOrders.reduce((sum, order) => sum + numberValue(order.final_amount ?? order.total), 0) / paidOrders.length
        : 0,
    },
    revenueOverTime: groupByDay(paidOrders.map((order) => ({ created_at: order.created_at, total: numberValue(order.final_amount ?? order.total) })), 'total'),
    ordersOverTime: groupByDay(placedOrders),
    paymentDistribution: groupBy(placedOrders as unknown as Record<string, unknown>[], 'payment_method'),
    orderStatusDistribution: groupBy(placedOrders as unknown as Record<string, unknown>[], 'order_status'),
    topProducts: Array.from(productSales.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value })),
    lowStockProducts: lowStockProducts.slice(0, 8),
    recentOrders: placedOrders.slice(0, 8),
    pendingPaymentOrders: analyticsOrders.filter((order) => order.payment_status === 'pending' || order.payment_status === 'authorised').slice(0, 8),
    failedPayments: payments.filter((payment) => payment.status === 'failed').slice(0, 8),
    pendingRefunds: refunds.filter((refund) => refund.status === 'requested' || refund.status === 'processing').slice(0, 8),
    recentCustomers: profiles.slice(0, 8),
    recentActivities: activities,
  };
}

export async function listPaymentsForAdmin() {
  const supabase = createServiceClient();
  return safeQuery<Array<PaymentRecord & { order?: Pick<Order, 'order_number' | 'customer_name' | 'customer_phone'> | null }>>(
    'payments-list',
    supabase
      .from('payments')
      .select('*, order:orders(order_number, customer_name, customer_phone)')
      .order('created_at', { ascending: false })
      .limit(100),
    []
  );
}

export async function listPaymentAttemptsForAdmin() {
  const supabase = createServiceClient();
  return safeQuery<Array<PaymentAttemptRecord & { order?: Pick<Order, 'order_number' | 'checkout_reference' | 'customer_name' | 'customer_phone'> | null }>>(
    'payment-attempts-list',
    supabase
      .from('payment_attempts')
      .select('*, order:orders(order_number, checkout_reference, customer_name, customer_phone)')
      .order('created_at', { ascending: false })
      .limit(150),
    []
  );
}

export async function listRefundsForAdmin() {
  const supabase = createServiceClient();
  return safeQuery<Array<RefundRecord & { order?: Pick<Order, 'order_number' | 'customer_name'> | null; payment?: Pick<PaymentRecord, 'gateway_payment_id' | 'amount_paise'> | null }>>(
    'refunds-list',
    supabase
      .from('refunds')
      .select('*, order:orders(order_number, customer_name), payment:payments(gateway_payment_id, amount_paise)')
      .order('created_at', { ascending: false })
      .limit(100),
    []
  );
}

export async function getAdminOrderDetail(orderId: string): Promise<AdminOrderDetail | null> {
  const supabase = createServiceClient();
  const order = await safeQuery<Order | null>(
    'order-detail',
    supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', orderId)
      .maybeSingle(),
    null
  );

  if (!order) return null;

  const [payments, refunds, statusHistory, auditLogs] = await Promise.all([
    safeQuery<PaymentRecord[]>(
      'order-detail-payments',
      supabase.from('payments').select('*').eq('order_id', orderId).order('created_at', { ascending: false }),
      []
    ),
    safeQuery<RefundRecord[]>(
      'order-detail-refunds',
      supabase.from('refunds').select('*').eq('order_id', orderId).order('created_at', { ascending: false }),
      []
    ),
    safeQuery<OrderStatusHistory[]>(
      'order-detail-history',
      supabase.from('order_status_history').select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
      []
    ),
    safeQuery<AdminAuditLogRecord[]>(
      'order-detail-audit',
      supabase.from('admin_audit_logs').select('*').eq('entity', 'order').eq('entity_id', orderId).order('created_at', { ascending: false }),
      []
    ),
  ]);

  return { order, payments, refunds, statusHistory, auditLogs };
}

export async function getAdminPaymentDetail(paymentId: string): Promise<AdminPaymentDetail | null> {
  const supabase = createServiceClient();
  const payment = await safeQuery<(PaymentRecord & { order?: Order | null }) | null>(
    'payment-detail',
    supabase
      .from('payments')
      .select('*, order:orders(*, items:order_items(*))')
      .eq('id', paymentId)
      .maybeSingle(),
    null
  );

  if (!payment) return null;

  const [attempts, refunds, allWebhookEvents, auditLogs] = await Promise.all([
    safeQuery<PaymentAttemptRecord[]>(
      'payment-detail-attempts',
      supabase.from('payment_attempts').select('*').eq('payment_id', paymentId).order('created_at', { ascending: false }),
      []
    ),
    safeQuery<RefundRecord[]>(
      'payment-detail-refunds',
      supabase.from('refunds').select('*').eq('payment_id', paymentId).order('created_at', { ascending: false }),
      []
    ),
    safeQuery<PaymentWebhookEventRecord[]>(
      'payment-detail-webhooks',
      supabase.from('payment_webhook_events').select('*').order('created_at', { ascending: false }).limit(100),
      []
    ),
    safeQuery<AdminAuditLogRecord[]>(
      'payment-detail-audit',
      supabase.from('admin_audit_logs').select('*').eq('entity', 'payment').eq('entity_id', paymentId).order('created_at', { ascending: false }),
      []
    ),
  ]);

  const gatewayIds = [payment.gateway_payment_id, payment.gateway_order_id].filter(Boolean) as string[];
  const webhookEvents = gatewayIds.length
    ? allWebhookEvents.filter((event) => {
        const payloadText = JSON.stringify(event.payload);
        return gatewayIds.some((id) => payloadText.includes(id));
      })
    : [];

  return { payment, attempts, refunds, webhookEvents, auditLogs };
}
