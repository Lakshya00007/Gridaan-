import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from '@/lib/config';

export const JEWELLERY_COMPLIANCE_DISCLAIMER =
  'Gridaan sells artificial, imitation, and fashion jewellery only. We do not sell real gold, real silver, diamonds, precious stones, bullion, digital gold, investment jewellery, or precious metal products.';

export const BUSINESS_CATEGORY =
  'Artificial Jewellery / Imitation Jewellery / Fashion Accessories';

export const BRAND_POSITIONING =
  'Affordable Indian artificial and imitation fashion jewellery with a premium look for festive dressing, gifting and everyday styling.';

export const businessInfo = {
  brandName: 'Gridaan',
  legalName: 'GRIDAAN',
  udyamRegistrationNumber: 'UDYAM-UP-18-0093491',
  canonicalWebsite: 'https://www.gridaan.com',
  category: BUSINESS_CATEGORY,
  businessPhone: '7505459485',
  businessPhoneE164: '+917505459485',
  whatsappNumber: '917505459485',
  address: {
    line1: 'Door 27, Malpura, Subhash Road',
    line2: 'Khurja, District Bulandshahar',
    stateAndPostcode: 'Uttar Pradesh – 203131',
    country: 'India',
    formatted:
      'Door 27, Malpura, Subhash Road, Khurja, District Bulandshahar, Uttar Pradesh – 203131, India',
    locality: 'Khurja',
    district: 'Bulandshahar',
    region: 'Uttar Pradesh',
    postalCode: '203131',
    countryCode: 'IN',
  },
  shipping: {
    feeRupees: SHIPPING_COST,
    freeShippingThresholdRupees: FREE_SHIPPING_THRESHOLD,
    supportedRegion: 'India',
  },
} as const;

const PLACEHOLDER_EMAIL_PATTERN =
  /(^|@)(example\.com|yourdomain\.com|test\.com)$|^(todo|test|example)@/i;

export function isPublishableSupportEmail(value: string | null | undefined) {
  if (!value) return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) && !PLACEHOLDER_EMAIL_PATTERN.test(value);
}

export function isValidIndianGstin(value: string | null | undefined) {
  return Boolean(value && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value));
}

export function buildSupportEmailHref(email: string) {
  return `mailto:${email}`;
}

export function buildBusinessPhoneHref() {
  return `tel:${businessInfo.businessPhoneE164}`;
}

export function buildBusinessWhatsAppHref(message?: string) {
  const suffix = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${businessInfo.whatsappNumber}${suffix}`;
}

export type BusinessInfo = typeof businessInfo;
