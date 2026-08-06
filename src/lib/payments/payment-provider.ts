import type {
  CapturePaymentInput,
  PaymentProviderName,
  PaymentProviderOrder,
  PaymentProviderOrderInput,
  ProviderPayment,
  ProviderRefund,
  RefundInput,
  VerifiedPayment,
  VerifyPaymentInput,
  WebhookValidationResult,
  WebhookValidationOptions,
} from './types';

export interface PaymentProvider {
  name: PaymentProviderName;
  createOrder(input: PaymentProviderOrderInput): Promise<PaymentProviderOrder>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifiedPayment>;
  capturePayment(input: CapturePaymentInput): Promise<ProviderPayment>;
  getPayment(paymentId: string): Promise<ProviderPayment>;
  createRefund(input: RefundInput): Promise<ProviderRefund>;
  getRefund(refundId: string): Promise<ProviderRefund>;
  validateWebhook(rawBody: string, signature: string | null, options?: WebhookValidationOptions): Promise<WebhookValidationResult>;
}
