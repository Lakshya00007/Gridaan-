import { z } from 'zod';

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(120)
  .regex(/^[a-zA-Z0-9:_-]+$/, 'Invalid idempotency key');

export const createPaymentOrderSchema = z.object({
  order_id: z.string().uuid(),
  checkout_reference: z.string().trim().min(8).max(80).optional(),
  idempotency_key: idempotencyKeySchema.optional(),
});

export const verifyPaymentSchema = z.object({
  order_id: z.string().uuid(),
  checkout_reference: z.string().trim().min(8).max(80).optional(),
  gateway_order_id: z.string().trim().min(3).max(120),
  gateway_payment_id: z.string().trim().min(3).max(120),
  signature: z.string().trim().min(3).max(500),
  idempotency_key: idempotencyKeySchema.optional(),
});

export const refundRequestSchema = z.object({
  payment_id: z.string().uuid(),
  amount_paise: z.number().int().positive(),
  reason: z.string().trim().min(3).max(500),
  notes: z.string().trim().max(1000).optional(),
  idempotency_key: idempotencyKeySchema,
});

export function assertExpectedPaymentAmount({
  expectedPaise,
  actualPaise,
  expectedCurrency,
  actualCurrency,
}: {
  expectedPaise: number;
  actualPaise: number;
  expectedCurrency: string;
  actualCurrency: string;
}) {
  if (expectedCurrency !== actualCurrency) {
    throw new Error('Payment currency mismatch');
  }
  if (expectedPaise !== actualPaise) {
    throw new Error('Payment amount mismatch');
  }
}
