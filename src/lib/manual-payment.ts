import type { PaymentMethod, PaymentStatus } from '@/types';

export function formatPaymentMethod(method: string): string {
  switch (method) {
    case 'razorpay':
      return 'Online Payment';
    case 'upi':
      return 'UPI';
    case 'card':
      return 'Card';
    case 'netbanking':
      return 'Net Banking';
    case 'wallet':
      return 'Wallet';
    case 'emi':
      return 'EMI';
    case 'cod':
      return 'Legacy payment method';
    case 'manual_upi':
      return 'Legacy payment method';
    case 'bank_transfer':
      return 'Legacy payment method';
    default:
      return 'Online Payment';
  }
}

export function formatAdminPaymentLabel(method: string, status: PaymentStatus): string {
  if (status === 'captured') return 'Captured';
  if (status === 'authorised') return 'Authorized';
  if (status === 'pending') return 'Pending';
  if (status === 'failed') return 'Failed';
  if (status === 'partially_refunded') return 'Partially refunded';
  if (status === 'refunded') return 'Refunded';
  if (method === 'manual_upi' || method === 'bank_transfer') return 'Legacy disabled';
  if (method === 'cod') return 'Legacy disabled';
  return status.replace(/_/g, ' ');
}

export function isManualPaymentMethod(
  method: string
): method is Extract<PaymentMethod, 'manual_upi' | 'bank_transfer'> {
  return method === 'manual_upi' || method === 'bank_transfer';
}
