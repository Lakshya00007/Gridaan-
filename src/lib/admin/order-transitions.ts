import type { OrderStatus, PaymentStatus } from '@/types';

const PAYMENT_CONTROLLED_STATUSES = new Set<OrderStatus>([
  'draft',
  'pending_payment',
  'payment_processing',
  'placed',
]);

const ADMIN_TRANSITIONS: Partial<Record<OrderStatus, readonly OrderStatus[]>> = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['shipped'],
  shipped: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: ['return_requested'],
  return_requested: ['returned'],
};

export function validateAdminOrderTransition({
  currentStatus,
  nextStatus,
  paymentStatus,
}: {
  currentStatus: OrderStatus;
  nextStatus: OrderStatus;
  paymentStatus: PaymentStatus;
}) {
  if (currentStatus === nextStatus) {
    return { allowed: true as const };
  }

  if (PAYMENT_CONTROLLED_STATUSES.has(nextStatus)) {
    return {
      allowed: false as const,
      code: 'payment_controlled_status',
      message: 'Payment-controlled order statuses cannot be set by an admin',
    };
  }

  if (paymentStatus !== 'captured') {
    return {
      allowed: false as const,
      code: 'payment_verification_required',
      message: 'Captured Razorpay payment is required before order status changes',
    };
  }

  if (!ADMIN_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
    return {
      allowed: false as const,
      code: 'invalid_status_transition',
      message: `Cannot change order status from ${currentStatus} to ${nextStatus}`,
    };
  }

  return { allowed: true as const };
}
