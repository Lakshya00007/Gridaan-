import { publicEnv } from '@/lib/env.public';

export const JEWELLERY_COMPLIANCE_DISCLAIMER =
  'Gridaan sells artificial, imitation, and fashion jewellery only. We do not sell real gold, real silver, diamonds, precious stones, bullion, digital gold, investment jewellery, or precious metal products.';

export const BUSINESS_CATEGORY =
  'Business category: Fashion Accessories / Artificial Jewellery / Imitation Jewellery.';

export const publicBusinessConfig = {
  brandName: 'Gridaan',
  businessName: publicEnv.NEXT_PUBLIC_BUSINESS_NAME ?? 'Gridaan',
  supportPhone: publicEnv.NEXT_PUBLIC_SUPPORT_PHONE ?? publicEnv.NEXT_PUBLIC_PAYMENT_SUPPORT_PHONE,
  supportEmail: publicEnv.NEXT_PUBLIC_SUPPORT_EMAIL ?? publicEnv.NEXT_PUBLIC_PAYMENT_SUPPORT_EMAIL,
  businessAddress: publicEnv.NEXT_PUBLIC_BUSINESS_ADDRESS,
  returnAddress: publicEnv.NEXT_PUBLIC_RETURN_ADDRESS ?? publicEnv.NEXT_PUBLIC_BUSINESS_ADDRESS,
} as const;

export function buildSupportPhoneHref(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${normalized}`;
}

export function buildSupportEmailHref(email: string) {
  return `mailto:${email}`;
}
