import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
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
  WebhookValidationResult,
  PaymentProviderName,
  WebhookValidationOptions,
} from './types';

function stableMockId(prefix: string, seed: string) {
  return `${prefix}_${createHash('sha256').update(seed).digest('hex').slice(0, 24)}`;
}

function safeCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export class MockPaymentProvider implements PaymentProvider {
  name: PaymentProviderName = 'mock';

  async createOrder(input: PaymentProviderOrderInput): Promise<PaymentProviderOrder> {
    return {
      provider: this.name,
      gatewayOrderId: stableMockId('order_mock', input.idempotencyKey),
      amountPaise: input.amountPaise,
      currency: input.currency,
      status: 'pending',
      integrationPending: true,
      metadata: {
        mode: 'mock',
        receipt: input.receipt,
        internalOrderId: input.internalOrderId,
        message: 'Mock payment order created. No Razorpay API call was made.',
      },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifiedPayment> {
    return {
      provider: this.name,
      gatewayOrderId: input.gatewayOrderId,
      gatewayPaymentId: input.gatewayPaymentId || stableMockId('pay_mock', randomUUID()),
      status: 'authorised',
      verified: Boolean(input.gatewayOrderId && input.gatewayPaymentId && input.signature),
      captured: false,
      integrationPending: true,
      metadata: {
        mode: 'mock',
        message: 'Frontend callback accepted in mock mode. Webhook confirmation is still required before marking the order paid.',
      },
    };
  }

  async capturePayment(input: CapturePaymentInput): Promise<ProviderPayment> {
    return {
      provider: this.name,
      gatewayPaymentId: input.gatewayPaymentId,
      amountPaise: input.amountPaise,
      currency: input.currency,
      status: 'captured',
      captured: true,
      metadata: {
        mode: 'mock',
        message: 'Mock capture result. No Razorpay API call was made.',
      },
    };
  }

  async getPayment(paymentId: string): Promise<ProviderPayment> {
    return {
      provider: this.name,
      gatewayPaymentId: paymentId,
      amountPaise: 0,
      currency: 'INR',
      status: 'pending',
      captured: false,
      metadata: {
        mode: 'mock',
        message: 'Mock payment lookup. No Razorpay API call was made.',
      },
    };
  }

  async createRefund(input: RefundInput): Promise<ProviderRefund> {
    return {
      provider: this.name,
      gatewayRefundId: stableMockId('rfnd_mock', input.idempotencyKey),
      gatewayPaymentId: input.paymentId,
      amountPaise: input.amountPaise,
      status: 'processing',
      integrationPending: true,
      metadata: {
        mode: 'mock',
        reason: input.reason,
        message: 'Mock refund created. Actual Razorpay refund API will be connected later.',
      },
    };
  }

  async getRefund(refundId: string): Promise<ProviderRefund> {
    return {
      provider: this.name,
      gatewayRefundId: refundId,
      gatewayPaymentId: '',
      amountPaise: 0,
      status: 'processing',
      integrationPending: true,
      metadata: {
        mode: 'mock',
        message: 'Mock refund lookup. No Razorpay API call was made.',
      },
    };
  }

  async validateWebhook(rawBody: string, signature: string | null, options: WebhookValidationOptions = {}): Promise<WebhookValidationResult> {
    const payloadHash = createHash('sha256').update(rawBody).digest('hex');
    const payload = JSON.parse(rawBody || '{}') as Record<string, unknown>;
    const eventId = String(options.eventId ?? payload.event_id ?? payload.id ?? stableMockId('evt_mock', payloadHash));
    const eventType = String(payload.event ?? payload.event_type ?? 'payment.mock');

    if (signature) {
      const expected = createHmac('sha256', 'mock_webhook_secret').update(rawBody).digest('hex');
      if (!safeCompare(signature, expected) && signature !== 'mock_signature') {
        return { valid: false, eventId, eventType, payloadHash, payload };
      }
    }

    return { valid: true, eventId, eventType, payloadHash, payload };
  }
}
