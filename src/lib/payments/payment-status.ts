import type { PaymentStatus } from '@/types';

export type PaymentEvent =
  | 'order_created'
  | 'frontend_verified'
  | 'webhook_authorised'
  | 'webhook_captured'
  | 'payment_failed'
  | 'refund_requested'
  | 'refund_processed'
  | 'dispute_opened';

const transitions: Record<PaymentStatus, Partial<Record<PaymentEvent, PaymentStatus>>> = {
  unpaid: {
    order_created: 'pending',
  },
  pending: {
    frontend_verified: 'authorised',
    webhook_authorised: 'authorised',
    webhook_captured: 'captured',
    payment_failed: 'failed',
  },
  authorised: {
    webhook_captured: 'captured',
    payment_failed: 'failed',
  },
  captured: {
    refund_requested: 'partially_refunded',
    refund_processed: 'refunded',
    dispute_opened: 'disputed',
  },
  paid: {
    refund_requested: 'partially_refunded',
    refund_processed: 'refunded',
    dispute_opened: 'disputed',
  },
  partially_refunded: {
    refund_processed: 'refunded',
    dispute_opened: 'disputed',
  },
  refunded: {},
  failed: {},
  disputed: {
    refund_processed: 'refunded',
  },
};

export function transitionPaymentStatus(
  current: PaymentStatus,
  event: PaymentEvent
): { ok: true; status: PaymentStatus } | { ok: false; reason: string } {
  const next = transitions[current]?.[event];
  if (!next) {
    return { ok: false, reason: `Cannot apply ${event} to ${current}` };
  }
  return { ok: true, status: next };
}

export function isCapturedPayment(status: PaymentStatus) {
  return status === 'captured' || status === 'partially_refunded' || status === 'refunded';
}
