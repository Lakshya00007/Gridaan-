import { describe, expect, it } from 'vitest';
import { calculateOrderTotals, validateCoupon } from '@/lib/commerce/pricing';
import { commitReservedStock, releaseReservedStock, reserveStock } from '@/lib/commerce/inventory-rules';
import { validateRefundAmount } from '@/lib/commerce/refund-rules';
import { calculateEarnedPoints, canAwardDeliveryPoints, redeemPoints } from '@/lib/commerce/loyalty-rules';
import { transitionPaymentStatus } from '@/lib/payments/payment-status';
import {
  canPlaceOrderAfterPayment,
  canRetryRazorpayPayment,
  isOnlinePaymentMethodAllowed,
  shouldReleaseReservation,
} from '@/lib/payments/online-payment-rules';
import { hasPermission } from '@/lib/admin/permissions-core';

describe('server-side price calculation', () => {
  it('calculates totals from trusted product prices', () => {
    const totals = calculateOrderTotals({
      items: [
        { product_id: 'a', quantity: 2, unit_price: 249 },
        { product_id: 'b', quantity: 1, unit_price: 699 },
      ],
      coupon: { code: 'WELCOME10', type: 'percentage', value: 10, min_order: 500, max_discount: 100 },
    });

    expect(totals.subtotal).toBe(1197);
    expect(totals.discount).toBe(100);
    expect(totals.shipping).toBe(0);
    expect(totals.total).toBe(1097);
  });
});

describe('coupon validation', () => {
  it('rejects invalid percentage discounts and expired coupons', () => {
    expect(
      validateCoupon(
        {
          code: 'BAD150',
          type: 'percentage',
          value: 150,
          is_active: true,
        },
        1000
      )
    ).toEqual({ ok: false, reason: 'Percentage discount cannot exceed 100' });

    expect(
      validateCoupon(
        {
          code: 'OLD',
          type: 'fixed',
          value: 100,
          expires_at: '2024-01-01T00:00:00.000Z',
          is_active: true,
        },
        1000,
        { now: new Date('2024-02-01T00:00:00.000Z') }
      )
    ).toEqual({ ok: false, reason: 'Coupon has expired' });
  });
});

describe('stock reservation and release', () => {
  it('reserves, releases, and commits stock without allowing negative stock', () => {
    const reserved = reserveStock({ stock: 5, reserved: 1 }, 3);
    expect(reserved).toEqual({ ok: true, stock: 5, reserved: 4, available: 1 });

    const released = releaseReservedStock({ stock: 5, reserved: 4 }, 2);
    expect(released).toEqual({ ok: true, stock: 5, reserved: 2, available: 3 });

    const committed = commitReservedStock({ stock: 5, reserved: 2 }, 2);
    expect(committed).toEqual({ ok: true, stock: 3, reserved: 0, available: 3 });

    expect(reserveStock({ stock: 2, reserved: 1 }, 2)).toEqual({
      ok: false,
      reason: 'Insufficient available stock',
    });
  });
});

describe('payment state transitions', () => {
  it('does not allow paid/captured state from frontend verification alone', () => {
    expect(transitionPaymentStatus('pending', 'frontend_verified')).toEqual({
      ok: true,
      status: 'authorised',
    });
    expect(transitionPaymentStatus('authorised', 'webhook_captured')).toEqual({
      ok: true,
      status: 'captured',
    });
    expect(transitionPaymentStatus('failed', 'webhook_captured')).toEqual({
      ok: false,
      reason: 'Cannot apply webhook_captured to failed',
    });
  });
});

describe('online-payment-only checkout rules', () => {
  it('accepts only Razorpay as a checkout payment method', () => {
    expect(isOnlinePaymentMethodAllowed('razorpay')).toBe(true);
    expect(isOnlinePaymentMethodAllowed('cod')).toBe(false);
    expect(isOnlinePaymentMethodAllowed('manual_upi')).toBe(false);
    expect(isOnlinePaymentMethodAllowed('bank_transfer')).toBe(false);
  });

  it('places an order only after verified captured payment with matching references', () => {
    expect(
      canPlaceOrderAfterPayment({
        signatureVerified: true,
        captured: true,
        amountMatches: true,
        currencyMatches: true,
        gatewayOrderMatches: true,
        checkoutReferenceMatches: true,
      })
    ).toEqual({ ok: true });

    expect(
      canPlaceOrderAfterPayment({
        signatureVerified: false,
        captured: true,
        amountMatches: true,
        currencyMatches: true,
        gatewayOrderMatches: true,
        checkoutReferenceMatches: true,
      })
    ).toEqual({ ok: false, reason: 'signature_not_verified' });

    expect(
      canPlaceOrderAfterPayment({
        signatureVerified: true,
        captured: false,
        amountMatches: true,
        currencyMatches: true,
        gatewayOrderMatches: true,
        checkoutReferenceMatches: true,
      })
    ).toEqual({ ok: false, reason: 'payment_not_captured' });

    expect(
      canPlaceOrderAfterPayment({
        signatureVerified: true,
        captured: true,
        amountMatches: false,
        currencyMatches: true,
        gatewayOrderMatches: true,
        checkoutReferenceMatches: true,
      })
    ).toEqual({ ok: false, reason: 'amount_mismatch' });
  });

  it('releases stock for failed/invalid/expired attempts but keeps retry path after checkout dismissal', () => {
    expect(shouldReleaseReservation('payment_failed')).toBe(true);
    expect(shouldReleaseReservation('invalid_signature')).toBe(true);
    expect(shouldReleaseReservation('reservation_expired')).toBe(true);
    expect(shouldReleaseReservation('checkout_dismissed')).toBe(false);
  });

  it('allows retry payment without treating the pending checkout as a placed order', () => {
    expect(
      canRetryRazorpayPayment({
        orderStatus: 'pending_payment',
        paymentStatus: 'failed',
        alreadyPlaced: false,
      })
    ).toBe(true);
    expect(
      canRetryRazorpayPayment({
        orderStatus: 'placed',
        paymentStatus: 'captured',
        alreadyPlaced: true,
      })
    ).toBe(false);
  });
});

describe('refund validation', () => {
  it('prevents over-refunds and duplicate processing', () => {
    expect(
      validateRefundAmount({
        capturedAmountPaise: 10_000,
        alreadyRefundedPaise: 2_000,
        requestedAmountPaise: 8_001,
      })
    ).toEqual({ ok: false, reason: 'Refund cannot exceed captured amount' });

    expect(
      validateRefundAmount({
        capturedAmountPaise: 10_000,
        alreadyRefundedPaise: 0,
        requestedAmountPaise: 5_000,
        existingProcessingRefund: true,
      })
    ).toEqual({ ok: false, reason: 'A refund is already being processed for this payment' });
  });
});

describe('loyalty rules', () => {
  it('prevents duplicate delivery points and enforces redemption limits', () => {
    expect(calculateEarnedPoints(12_345, 1)).toBe(123);
    expect(
      canAwardDeliveryPoints({
        orderId: 'order-1',
        existingTransactions: [{ order_id: 'order-1', transaction_type: 'earned' }],
      })
    ).toEqual({ ok: false, reason: 'Loyalty points were already awarded for this order' });

    expect(
      redeemPoints({
        balance: 500,
        requestedPoints: 200,
        minimumRedemption: 100,
        maximumRedemption: 300,
      })
    ).toEqual({ ok: true, points: 200, balanceAfter: 300 });
  });
});

describe('admin permission checks', () => {
  it('enforces role-scoped write permissions', () => {
    expect(hasPermission({ role: 'viewer', permission: 'orders.write' })).toBe(false);
    expect(hasPermission({ role: 'operations', permission: 'orders.write' })).toBe(true);
    expect(hasPermission({ role: 'analyst', permission: 'reports.read' })).toBe(true);
    expect(hasPermission({ role: 'support', permission: 'products.write' })).toBe(false);
    expect(hasPermission({ role: null, permission: 'orders.read', legacyIsAdmin: true })).toBe(true);
  });
});
