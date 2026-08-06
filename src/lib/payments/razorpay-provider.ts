import 'server-only';

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { serverEnv } from '@/lib/env.server';
import {
  buildRazorpayOrderPayload,
  getRazorpayOrderResponseError,
  getRazorpayOrderValidationError,
} from './checkout-preparation';
import { RazorpayProviderError } from './checkout-errors';
import type { PaymentProvider } from './payment-provider';
import type {
  CapturePaymentInput,
  PaymentProviderOrder,
  PaymentProviderOrderInput,
  ProviderPayment,
  ProviderRefund,
  RefundInput,
  VerifiedPayment,
  VerifyPaymentInput,
  WebhookValidationOptions,
  WebhookValidationResult,
} from './types';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

function safeCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function requireRazorpayCredentials() {
  if (!serverEnv.RAZORPAY_KEY_ID || !serverEnv.RAZORPAY_KEY_SECRET) {
    throw new RazorpayProviderError({
      code: 'razorpay_not_configured',
      description: 'Razorpay server credentials are not configured',
      httpStatus: 500,
    });
  }
  return {
    keyId: serverEnv.RAZORPAY_KEY_ID,
    keySecret: serverEnv.RAZORPAY_KEY_SECRET,
  };
}

function authHeader() {
  const { keyId, keySecret } = requireRazorpayCredentials();
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

async function razorpayFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${RAZORPAY_API_BASE}${path}`, {
    ...init,
    headers: {
      authorization: authHeader(),
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  const data = (await response.json().catch(() => ({}))) as T & { error?: { description?: string; code?: string } };
  if (!response.ok) {
    throw new RazorpayProviderError({
      code: data.error?.code || 'razorpay_request_failed',
      description:
        data.error?.description || `Razorpay request failed with status ${response.status}`,
      httpStatus: response.status,
    });
  }
  return data;
}

function mapRazorpayPaymentStatus(status: string, captured?: boolean): ProviderPayment['status'] {
  if (captured || status === 'captured') return 'captured';
  if (status === 'authorized') return 'authorised';
  if (status === 'failed') return 'failed';
  if (status === 'refunded') return 'refunded';
  return 'pending';
}

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  amount_paid?: number;
  currency: string;
  receipt?: string;
  status: string;
  notes?: Record<string, string>;
};

type RazorpayPaymentResponse = {
  id: string;
  order_id?: string;
  amount: number;
  currency: string;
  method?: string;
  status: string;
  captured?: boolean;
  captured_at?: number;
  error_code?: string | null;
  error_description?: string | null;
};

type RazorpayRefundResponse = {
  id: string;
  payment_id: string;
  amount: number;
  status: string;
};

export class RazorpayProvider implements PaymentProvider {
  name = 'razorpay' as const;

  async createOrder(input: PaymentProviderOrderInput): Promise<PaymentProviderOrder> {
    const validationError = getRazorpayOrderValidationError({
      amountPaise: input.amountPaise,
      currency: input.currency,
      receipt: input.receipt,
    });
    if (validationError) {
      throw new RazorpayProviderError({
        code: validationError,
        description: 'Razorpay order payload validation failed',
        httpStatus: 400,
      });
    }

    const order = await razorpayFetch<RazorpayOrderResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify(buildRazorpayOrderPayload(input)),
    });
    const responseError = getRazorpayOrderResponseError({
      expectedAmountPaise: input.amountPaise,
      actualAmountPaise: order.amount,
      expectedCurrency: input.currency,
      actualCurrency: order.currency,
    });
    if (responseError) {
      throw new RazorpayProviderError({
        code: responseError,
        description: 'Razorpay order response did not match the checkout request',
        httpStatus: 502,
      });
    }

    return {
      provider: this.name,
      gatewayOrderId: order.id,
      amountPaise: order.amount,
      currency: input.currency,
      status: order.status === 'paid' ? 'captured' : 'pending',
      integrationPending: false,
      metadata: {
        receipt: order.receipt ?? input.receipt,
        razorpay_status: order.status,
      },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifiedPayment> {
    const { keySecret } = requireRazorpayCredentials();
    const message = `${input.gatewayOrderId}|${input.gatewayPaymentId}`;
    const expected = createHmac('sha256', keySecret).update(message).digest('hex');
    const verified = safeCompare(input.signature, expected);

    return {
      provider: this.name,
      gatewayOrderId: input.gatewayOrderId,
      gatewayPaymentId: input.gatewayPaymentId,
      status: verified ? 'authorised' : 'failed',
      verified,
      captured: false,
      integrationPending: false,
      metadata: {
        signature_verified: verified,
      },
    };
  }

  async capturePayment(input: CapturePaymentInput): Promise<ProviderPayment> {
    const payment = await razorpayFetch<RazorpayPaymentResponse>(`/payments/${encodeURIComponent(input.gatewayPaymentId)}/capture`, {
      method: 'POST',
      body: JSON.stringify({
        amount: input.amountPaise,
        currency: input.currency,
      }),
    });
    return this.mapPayment(payment);
  }

  async getPayment(paymentId: string): Promise<ProviderPayment> {
    const payment = await razorpayFetch<RazorpayPaymentResponse>(`/payments/${encodeURIComponent(paymentId)}`);
    return this.mapPayment(payment);
  }

  async createRefund(input: RefundInput): Promise<ProviderRefund> {
    const refund = await razorpayFetch<RazorpayRefundResponse>(`/payments/${encodeURIComponent(input.paymentId)}/refund`, {
      method: 'POST',
      body: JSON.stringify({
        amount: input.amountPaise,
        notes: input.notes ?? {},
        speed: 'normal',
        receipt: input.idempotencyKey.slice(0, 40),
      }),
      headers: {
        'x-razorpay-idempotency-key': input.idempotencyKey,
      },
    });

    return {
      provider: this.name,
      gatewayRefundId: refund.id,
      gatewayPaymentId: refund.payment_id,
      amountPaise: refund.amount,
      status: refund.status === 'processed' ? 'processed' : refund.status === 'failed' ? 'failed' : 'processing',
      integrationPending: false,
      metadata: { razorpay_status: refund.status },
    };
  }

  async getRefund(refundId: string): Promise<ProviderRefund> {
    const refund = await razorpayFetch<RazorpayRefundResponse>(`/refunds/${encodeURIComponent(refundId)}`);
    return {
      provider: this.name,
      gatewayRefundId: refund.id,
      gatewayPaymentId: refund.payment_id,
      amountPaise: refund.amount,
      status: refund.status === 'processed' ? 'processed' : refund.status === 'failed' ? 'failed' : 'processing',
      integrationPending: false,
      metadata: { razorpay_status: refund.status },
    };
  }

  async validateWebhook(
    rawBody: string,
    signature: string | null,
    options: WebhookValidationOptions = {}
  ): Promise<WebhookValidationResult> {
    const payloadHash = createHash('sha256').update(rawBody).digest('hex');
    const payload = JSON.parse(rawBody || '{}') as Record<string, unknown>;
    const eventId = String(options.eventId ?? payload.event_id ?? payload.id ?? `evt_${payloadHash.slice(0, 24)}`);
    const eventType = String(payload.event ?? payload.event_type ?? 'payment.unknown');

    if (!serverEnv.RAZORPAY_WEBHOOK_SECRET || !signature) {
      return { valid: false, eventId, eventType, payloadHash, payload };
    }

    const expected = createHmac('sha256', serverEnv.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
    return {
      valid: safeCompare(signature, expected),
      eventId,
      eventType,
      payloadHash,
      payload,
    };
  }

  private mapPayment(payment: RazorpayPaymentResponse): ProviderPayment {
    if (payment.currency !== 'INR' || !Number.isSafeInteger(payment.amount)) {
      throw new RazorpayProviderError({
        code: 'razorpay_payment_response_mismatch',
        description: 'Razorpay payment response amount or currency is invalid',
        httpStatus: 502,
      });
    }
    const status = mapRazorpayPaymentStatus(payment.status, payment.captured);
    return {
      provider: this.name,
      gatewayPaymentId: payment.id,
      gatewayOrderId: payment.order_id,
      amountPaise: payment.amount,
      currency: 'INR',
      method: payment.method,
      status,
      captured: status === 'captured',
      capturedAt: payment.captured_at ? new Date(payment.captured_at * 1000).toISOString() : undefined,
      metadata: {
        razorpay_status: payment.status,
        error_code: payment.error_code ?? null,
        error_description: payment.error_description ?? null,
      },
    };
  }
}
