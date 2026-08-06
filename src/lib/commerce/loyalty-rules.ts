export type LoyaltyTransactionKind = 'earned' | 'redeemed' | 'expired' | 'adjusted' | 'reversed';

export type LoyaltyTransaction = {
  order_id: string | null;
  transaction_type: LoyaltyTransactionKind;
};

export function calculateEarnedPoints(orderTotalPaise: number, pointsPerRupee = 1) {
  if (orderTotalPaise <= 0 || pointsPerRupee <= 0) return 0;
  return Math.floor(orderTotalPaise / 100) * pointsPerRupee;
}

export function canAwardDeliveryPoints({
  orderId,
  existingTransactions,
}: {
  orderId: string;
  existingTransactions: LoyaltyTransaction[];
}): { ok: true } | { ok: false; reason: string } {
  const alreadyEarned = existingTransactions.some(
    (transaction) => transaction.order_id === orderId && transaction.transaction_type === 'earned'
  );

  if (alreadyEarned) {
    return { ok: false, reason: 'Loyalty points were already awarded for this order' };
  }

  return { ok: true };
}

export function redeemPoints({
  balance,
  requestedPoints,
  minimumRedemption,
  maximumRedemption,
}: {
  balance: number;
  requestedPoints: number;
  minimumRedemption: number;
  maximumRedemption: number;
}): { ok: true; points: number; balanceAfter: number } | { ok: false; reason: string } {
  if (!Number.isInteger(requestedPoints) || requestedPoints <= 0) {
    return { ok: false, reason: 'Points must be a positive integer' };
  }
  if (requestedPoints < minimumRedemption) {
    return { ok: false, reason: 'Minimum redemption threshold not met' };
  }
  if (requestedPoints > maximumRedemption) {
    return { ok: false, reason: 'Redemption exceeds maximum allowed points' };
  }
  if (requestedPoints > balance) {
    return { ok: false, reason: 'Insufficient loyalty points' };
  }

  return { ok: true, points: requestedPoints, balanceAfter: balance - requestedPoints };
}
