export type RefundValidationInput = {
  capturedAmountPaise: number;
  alreadyRefundedPaise: number;
  requestedAmountPaise: number;
  existingProcessingRefund?: boolean;
};

export function validateRefundAmount(input: RefundValidationInput):
  | { ok: true; refundablePaise: number }
  | { ok: false; reason: string } {
  const refundablePaise = input.capturedAmountPaise - input.alreadyRefundedPaise;

  if (input.existingProcessingRefund) {
    return { ok: false, reason: 'A refund is already being processed for this payment' };
  }
  if (!Number.isInteger(input.requestedAmountPaise) || input.requestedAmountPaise <= 0) {
    return { ok: false, reason: 'Refund amount must be greater than zero' };
  }
  if (input.capturedAmountPaise <= 0) {
    return { ok: false, reason: 'Payment has no captured amount to refund' };
  }
  if (input.requestedAmountPaise > refundablePaise) {
    return { ok: false, reason: 'Refund cannot exceed captured amount' };
  }

  return { ok: true, refundablePaise };
}
