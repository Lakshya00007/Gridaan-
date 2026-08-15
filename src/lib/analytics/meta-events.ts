import type { CartProductSnapshot, OrderItem, OrderSuccessSummary, Product } from '@/types';

export type MetaStandardEventName =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Purchase';

export type MetaContent = {
  id: string;
  quantity: number;
  item_price?: number;
};

export type MetaEcommerceEventData = {
  content_ids: string[];
  content_type: 'product';
  contents: MetaContent[];
  currency: 'INR';
  value?: number;
  content_name?: string;
  num_items?: number;
  order_id?: string;
};

type ProductLike = Pick<Product, 'id' | 'name' | 'price'>;
type CartProductLike = Pick<CartProductSnapshot, 'id' | 'name' | 'price'>;
type CartItemLike = {
  product: CartProductLike;
  quantity: number;
};

export function finiteRupeeValue(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric * 100) / 100;
}

export function positiveQuantity(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 1;
  return Math.floor(numeric);
}

export function toMetaContentId(input: Pick<Product, 'id'> | Pick<OrderItem, 'product_id'> | string) {
  if (typeof input === 'string') return input;
  if ('product_id' in input) return String(input.product_id);
  return String(input.id);
}

export function toMetaContent(product: ProductLike | CartProductLike, quantity = 1): MetaContent {
  return {
    id: toMetaContentId(product),
    quantity: positiveQuantity(quantity),
    item_price: finiteRupeeValue(product.price),
  };
}

export function toMetaContents(items: CartItemLike[]) {
  return items
    .map((item) => toMetaContent(item.product, item.quantity))
    .filter((content) => content.id && content.quantity > 0);
}

export function buildViewContentEvent(product: ProductLike): MetaEcommerceEventData {
  const content = toMetaContent(product, 1);
  return {
    content_ids: [content.id],
    content_name: product.name,
    content_type: 'product',
    contents: [content],
    value: finiteRupeeValue(product.price),
    currency: 'INR',
  };
}

export function buildAddToCartEvent(product: ProductLike, quantity = 1): MetaEcommerceEventData {
  const content = toMetaContent(product, quantity);
  return {
    content_ids: [content.id],
    content_name: product.name,
    content_type: 'product',
    contents: [content],
    value: finiteRupeeValue(product.price * content.quantity),
    currency: 'INR',
  };
}

export function buildInitiateCheckoutEvent({
  items,
  value,
}: {
  items: CartItemLike[];
  value: number;
}): MetaEcommerceEventData {
  const contents = toMetaContents(items);
  return {
    content_ids: contents.map((content) => content.id),
    content_type: 'product',
    contents,
    value: finiteRupeeValue(value),
    currency: 'INR',
    num_items: contents.reduce((sum, content) => sum + content.quantity, 0),
  };
}

export function getPurchaseEventId(orderNumber: string) {
  return `purchase:${orderNumber}`;
}

export function buildBrowserPurchaseEvent({
  order,
  items,
}: {
  order: OrderSuccessSummary;
  items: CartItemLike[];
}): { eventId: string; data: MetaEcommerceEventData } {
  return {
    eventId: getPurchaseEventId(order.order_number),
    data: {
      ...buildInitiateCheckoutEvent({ items, value: order.total }),
      order_id: order.order_number,
    },
  };
}

export function buildServerPurchaseEvent({
  orderNumber,
  value,
  items,
}: {
  orderNumber: string;
  value: number;
  items: Pick<OrderItem, 'product_id' | 'quantity' | 'unit_price'>[];
}): { eventId: string; data: MetaEcommerceEventData } {
  const contents = items.map((item) => ({
    id: toMetaContentId(item),
    quantity: positiveQuantity(item.quantity),
    item_price: finiteRupeeValue(item.unit_price),
  }));
  return {
    eventId: getPurchaseEventId(orderNumber),
    data: {
      content_ids: contents.map((content) => content.id),
      content_type: 'product',
      contents,
      value: finiteRupeeValue(value),
      currency: 'INR',
      num_items: contents.reduce((sum, content) => sum + content.quantity, 0),
      order_id: orderNumber,
    },
  };
}
