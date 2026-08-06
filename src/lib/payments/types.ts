import type { PaymentStatus } from '@/types';

export type PaymentProviderName = 'mock' | 'razorpay';
export type PaymentCurrency = 'INR';

export type PaymentProviderOrderInput = {
  internalOrderId: string;
  receipt: string;
  amountPaise: number;
  currency: PaymentCurrency;
  idempotencyKey: string;
  notes?: Record<string, string>;
};

export type PaymentProviderOrder = {
  provider: PaymentProviderName;
  gatewayOrderId: string;
  amountPaise: number;
  currency: PaymentCurrency;
  status: PaymentStatus;
  integrationPending: boolean;
  metadata: Record<string, unknown>;
};

export type VerifyPaymentInput = {
  internalOrderId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  signature: string;
  expectedAmountPaise: number;
  currency: PaymentCurrency;
};

export type VerifiedPayment = {
  provider: PaymentProviderName;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  status: PaymentStatus;
  verified: boolean;
  captured: boolean;
  integrationPending: boolean;
  metadata: Record<string, unknown>;
};

export type CapturePaymentInput = {
  gatewayPaymentId: string;
  amountPaise: number;
  currency: PaymentCurrency;
};

export type ProviderPayment = {
  provider: PaymentProviderName;
  gatewayPaymentId: string;
  gatewayOrderId?: string;
  amountPaise: number;
  currency: PaymentCurrency;
  method?: string;
  status: PaymentStatus;
  captured: boolean;
  capturedAt?: string;
  metadata: Record<string, unknown>;
};

export type RefundInput = {
  paymentId: string;
  amountPaise: number;
  reason: string;
  idempotencyKey: string;
  notes?: Record<string, string>;
};

export type ProviderRefund = {
  provider: PaymentProviderName;
  gatewayRefundId: string;
  gatewayPaymentId: string;
  amountPaise: number;
  status: 'requested' | 'processing' | 'processed' | 'failed';
  integrationPending: boolean;
  metadata: Record<string, unknown>;
};

export type WebhookValidationResult = {
  valid: boolean;
  eventId: string;
  eventType: string;
  payloadHash: string;
  payload: Record<string, unknown>;
};

export type WebhookValidationOptions = {
  eventId?: string | null;
};
