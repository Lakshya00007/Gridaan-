import { publicEnv } from '@/lib/env.public';
import type { PaymentMethod, PaymentStatus } from '@/types';

export const manualPaymentConfig = {
  enabled: publicEnv.NEXT_PUBLIC_MANUAL_PAYMENT_ENABLED,
  upiId: publicEnv.NEXT_PUBLIC_UPI_ID,
  upiName: publicEnv.NEXT_PUBLIC_UPI_NAME,
  bankAccountName: publicEnv.NEXT_PUBLIC_BANK_ACCOUNT_NAME,
  bankAccountNumber: publicEnv.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER,
  bankIfsc: publicEnv.NEXT_PUBLIC_BANK_IFSC,
  bankName: publicEnv.NEXT_PUBLIC_BANK_NAME,
  bankBranch: publicEnv.NEXT_PUBLIC_BANK_BRANCH,
  supportPhone: publicEnv.NEXT_PUBLIC_PAYMENT_SUPPORT_PHONE,
  supportEmail: publicEnv.NEXT_PUBLIC_PAYMENT_SUPPORT_EMAIL,
} as const;

export const manualUpiAvailable =
  manualPaymentConfig.enabled && Boolean(manualPaymentConfig.upiId);

export const bankTransferAvailable =
  manualPaymentConfig.enabled &&
  Boolean(manualPaymentConfig.bankAccountNumber && manualPaymentConfig.bankIfsc);

export function formatPaymentMethod(method: string): string {
  switch (method) {
    case 'cod':
      return 'Cash on Delivery';
    case 'manual_upi':
      return 'Manual UPI';
    case 'bank_transfer':
      return 'Bank Transfer';
    default:
      return 'Online Payment (Historical)';
  }
}

export function formatAdminPaymentLabel(method: string, status: PaymentStatus): string {
  if (status === 'paid') return 'Paid';
  if (status === 'failed') return 'Failed';
  if (method === 'manual_upi') return 'UPI Review';
  if (method === 'bank_transfer') return 'Bank Transfer Review';
  return 'COD';
}

export function isManualPaymentMethod(
  method: string
): method is Extract<PaymentMethod, 'manual_upi' | 'bank_transfer'> {
  return method === 'manual_upi' || method === 'bank_transfer';
}

export function getPaymentSupportHref(): string | null {
  if (manualPaymentConfig.supportPhone) {
    const phone = manualPaymentConfig.supportPhone.replace(/\D/g, '');
    if (phone) {
      return `https://wa.me/${phone}?text=${encodeURIComponent(
        'Hi Gridaan, I need help with my payment or order.'
      )}`;
    }
  }

  if (manualPaymentConfig.supportEmail) {
    return `mailto:${manualPaymentConfig.supportEmail}`;
  }

  return null;
}
