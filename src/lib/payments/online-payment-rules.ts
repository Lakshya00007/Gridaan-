import type { PaymentMethod, PaymentStatus } from '@/types';

type PlacementInput = {
  signatureVerified: boolean;
  captured: boolean;
  amountMatches: boolean;
  currencyMatches: boolean;
  gatewayOrderMatches: boolean;
  checkoutReferenceMatches: boolean;
};

type PaymentFailureReason =
  | 'checkout_dismissed'
  | 'payment_failed'
  | 'invalid_signature'
  | 'amount_mismatch'
  | 'currency_mismatch'
  | 'webhook_mismatch'
  | 'reservation_expired'
  | 'customer_cancelled';

const RETRYABLE_PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'authorised', 'failed'];

export function isOnlinePaymentMethodAllowed(method: PaymentMethod | string) {
  return method === 'razorpay';
}

export function canPlaceOrderAfterPayment(input: PlacementInput):
  | { ok: true }
  | { ok: false; reason: string } {
  if (!input.signatureVerified) return { ok: false, reason: 'signature_not_verified' };
  if (!input.gatewayOrderMatches) return { ok: false, reason: 'gateway_order_mismatch' };
  if (!input.checkoutReferenceMatches) return { ok: false, reason: 'checkout_reference_mismatch' };
  if (!input.amountMatches) return { ok: false, reason: 'amount_mismatch' };
  if (!input.currencyMatches) return { ok: false, reason: 'currency_mismatch' };
  if (!input.captured) return { ok: false, reason: 'payment_not_captured' };
  return { ok: true };
}

export function shouldReleaseReservation(reason: PaymentFailureReason) {
  return reason !== 'checkout_dismissed';
}

export function canRetryRazorpayPayment({
  orderStatus,
  paymentStatus,
  alreadyPlaced,
}: {
  orderStatus: string;
  paymentStatus: PaymentStatus;
  alreadyPlaced: boolean;
}) {
  if (alreadyPlaced || orderStatus === 'placed') return false;
  return orderStatus === 'pending_payment' && RETRYABLE_PAYMENT_STATUSES.includes(paymentStatus);
}
