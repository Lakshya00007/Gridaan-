import type { CouponType } from '@/types';

export type PricingItem = {
  product_id: string;
  quantity: number;
  unit_price: number;
};

export type PricingCoupon = {
  code: string;
  type: CouponType;
  value: number;
  min_order?: number | null;
  max_discount?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  is_active?: boolean;
  usage_limit?: number | null;
  usage_count?: number;
  new_customers_only?: boolean;
  applicable_product_ids?: string[];
  applicable_category_ids?: string[];
};

export type OrderTotals = {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  itemCount: number;
};

export type CouponValidationContext = {
  now?: Date;
  isFirstOrder?: boolean;
  productIds?: string[];
  categoryIds?: string[];
};

export const DEFAULT_FREE_SHIPPING_THRESHOLD = 999;
export const DEFAULT_SHIPPING_FEE = 79;

export function toPaise(rupees: number) {
  if (!Number.isFinite(rupees)) return 0;
  return Math.round(rupees * 100);
}

export function fromPaise(paise: number) {
  if (!Number.isFinite(paise)) return 0;
  return Math.round(paise) / 100;
}

export function calculateDiscount(subtotal: number, coupon: PricingCoupon | null) {
  if (!coupon) return 0;
  if (coupon.type === 'free_shipping') return 0;

  let discount = 0;
  if (coupon.type === 'percentage' || coupon.type === 'product_discount' || coupon.type === 'category_discount') {
    discount = Math.round((subtotal * coupon.value) / 100);
  } else {
    discount = coupon.value;
  }

  if (coupon.max_discount != null) {
    discount = Math.min(discount, coupon.max_discount);
  }

  return Math.max(0, Math.min(discount, subtotal));
}

export function validateCoupon(
  coupon: PricingCoupon | null,
  subtotal: number,
  context: CouponValidationContext = {}
): { ok: true } | { ok: false; reason: string } {
  if (!coupon) return { ok: false, reason: 'Coupon not found' };
  if (coupon.is_active === false) return { ok: false, reason: 'Coupon is inactive' };
  if (coupon.usage_limit != null && (coupon.usage_count ?? 0) >= coupon.usage_limit) {
    return { ok: false, reason: 'Coupon usage limit reached' };
  }
  if (subtotal < (coupon.min_order ?? 0)) {
    return { ok: false, reason: 'Minimum order value not met' };
  }

  const now = context.now ?? new Date();
  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    return { ok: false, reason: 'Coupon has not started' };
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    return { ok: false, reason: 'Coupon has expired' };
  }
  if (coupon.new_customers_only && !context.isFirstOrder) {
    return { ok: false, reason: 'Coupon is only for first orders' };
  }
  if (coupon.value < 0) return { ok: false, reason: 'Coupon discount cannot be negative' };
  if (
    (coupon.type === 'percentage' || coupon.type === 'product_discount' || coupon.type === 'category_discount') &&
    coupon.value > 100
  ) {
    return { ok: false, reason: 'Percentage discount cannot exceed 100' };
  }
  if (coupon.applicable_product_ids?.length && context.productIds?.length) {
    const hasProduct = context.productIds.some((id) => coupon.applicable_product_ids?.includes(id));
    if (!hasProduct) return { ok: false, reason: 'Coupon does not apply to these products' };
  }
  if (coupon.applicable_category_ids?.length && context.categoryIds?.length) {
    const hasCategory = context.categoryIds.some((id) => coupon.applicable_category_ids?.includes(id));
    if (!hasCategory) return { ok: false, reason: 'Coupon does not apply to these categories' };
  }

  return { ok: true };
}

export function calculateOrderTotals({
  items,
  coupon = null,
  shippingFee = DEFAULT_SHIPPING_FEE,
  freeShippingThreshold = DEFAULT_FREE_SHIPPING_THRESHOLD,
  taxRate = 0,
}: {
  items: PricingItem[];
  coupon?: PricingCoupon | null;
  shippingFee?: number;
  freeShippingThreshold?: number;
  taxRate?: number;
}): OrderTotals {
  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const discount = calculateDiscount(subtotal, coupon);
  const shipping =
    coupon?.type === 'free_shipping' || subtotal - discount >= freeShippingThreshold
      ? 0
      : shippingFee;
  const tax = Math.round((subtotal - discount) * taxRate);

  return {
    subtotal,
    discount,
    shipping,
    tax,
    total: Math.max(0, subtotal - discount + shipping + tax),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}
