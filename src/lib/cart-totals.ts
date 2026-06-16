import 'server-only';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST, TAX_PERCENT } from './config';
import type { CartItem, CartTotals, Coupon, Product } from '@/types';

export interface ComputeInput {
  items: { product_id: string; quantity: number; product: Product }[];
  coupon: Pick<Coupon, 'type' | 'value' | 'min_order' | 'max_discount'> | null;
}

export function computeCartTotals({ items, coupon }: ComputeInput): CartTotals {
  const subtotal = items.reduce(
    (acc, it) => acc + it.product.price * it.quantity,
    0
  );
  let discount = 0;
  if (coupon && subtotal >= coupon.min_order) {
    discount = coupon.type === 'percentage'
      ? Math.round((subtotal * coupon.value) / 100)
      : coupon.value;
    if (coupon.max_discount != null) discount = Math.min(discount, coupon.max_discount);
    discount = Math.min(discount, subtotal);
  }
  const shipping = subtotal - discount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const tax = Math.round((subtotal - discount) * TAX_PERCENT);
  const total = Math.max(0, subtotal - discount + shipping + tax);
  const item_count = items.reduce((acc, it) => acc + it.quantity, 0);
  return { subtotal, discount, shipping, tax, total, item_count };
}

export function isFreeShippingEligible(subtotal: number) {
  return subtotal >= FREE_SHIPPING_THRESHOLD;
}

export type { CartItem, CartTotals };
