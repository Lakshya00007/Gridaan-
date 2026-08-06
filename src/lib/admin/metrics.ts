import type { Order } from '@/types';

const NON_PLACED_ORDER_STATUSES = new Set<Order['order_status']>([
  'draft',
  'pending_payment',
  'payment_processing',
]);
const VERIFIED_PAYMENT_STATUSES = new Set<Order['payment_status']>([
  'captured',
  'partially_refunded',
  'refunded',
]);

export function isVerifiedPlacedOrder(order: Pick<Order, 'is_test' | 'payment_status' | 'order_status'>) {
  return (
    order.is_test !== true &&
    VERIFIED_PAYMENT_STATUSES.has(order.payment_status) &&
    !NON_PLACED_ORDER_STATUSES.has(order.order_status)
  );
}

export function getVerifiedPlacedOrders<T extends Pick<Order, 'is_test' | 'payment_status' | 'order_status'>>(
  orders: T[]
) {
  return orders.filter(isVerifiedPlacedOrder);
}
