/**
 * Server-side e-commerce business logic. Used by API routes and
 * Server Actions. Never imported from client code.
 */
import 'server-only';
import Razorpay from 'razorpay';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from './env';

let _razorpay: Razorpay | null = null;
export function getRazorpay() {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}

export interface CreateRzpOrderInput {
  amount: number; // in paise
  receipt: string;
  notes?: Record<string, string>;
}

export async function createRzpOrder(input: CreateRzpOrderInput) {
  const rzp = getRazorpay();
  return rzp.orders.create({
    amount: Math.round(input.amount),
    currency: 'INR',
    receipt: input.receipt,
    notes: input.notes ?? {},
  });
}

export interface VerifyRzpSignatureInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export function verifyRzpSignature(input: VerifyRzpSignatureInput): boolean {
  const { orderId, paymentId, signature } = input;
  const payload = `${orderId}|${paymentId}`;
  const expected = createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    // In production this must be set. Log loudly so it surfaces immediately.
    console.error('[razorpay] RAZORPAY_WEBHOOK_SECRET is not configured — rejecting webhook');
    return false;
  }
  const expected = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function generateIdempotencyKey(): string {
  return randomBytes(16).toString('hex');
}
