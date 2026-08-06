import { createHash } from 'node:crypto';
import type { CheckoutInput } from '@/lib/validators';
import type { Product } from '@/types';
import type { PaymentProviderOrder, PaymentProviderOrderInput } from './types';

type CheckoutProduct = Pick<
  Product,
  'id' | 'slug' | 'name' | 'sku' | 'images' | 'price' | 'original_price' | 'category_id'
>;

export type OrderItemInsertRow = {
  order_id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  sku: string | null;
  product_snapshot: Record<string, unknown>;
  unit_price: number;
  quantity: number;
  discount_amount: number;
  discount: number;
  tax: number;
  line_total: number;
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, canonicalize(nested)])
  );
}

export function createCheckoutReference(idempotencyKey: string) {
  const digest = createHash('sha256').update(idempotencyKey).digest('hex');
  return `chk_${digest.slice(0, 28)}`;
}

export function createRazorpayReceipt(checkoutReference: string, paymentAttemptKey: string) {
  const digest = createHash('sha256')
    .update(`${checkoutReference}:${paymentAttemptKey}`)
    .digest('hex');
  return `gr_${digest.slice(0, 32)}`;
}

export function createCheckoutFingerprint(input: CheckoutInput, profileId?: string | null) {
  const normalized = canonicalize({
    input: {
      ...input,
      items: [...input.items].sort((left, right) =>
        left.product_id.localeCompare(right.product_id)
      ),
    },
    profile_id: profileId ?? null,
  });

  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export function buildOrderItemRows({
  orderId,
  items,
  productsById,
}: {
  orderId: string;
  items: CheckoutInput['items'];
  productsById: Map<string, CheckoutProduct>;
}): OrderItemInsertRow[] {
  return items.map((item) => {
    const product = productsById.get(item.product_id);
    if (!product) throw new Error(`Missing trusted product ${item.product_id}`);

    const unitPrice = Number(product.price);
    return {
      order_id: orderId,
      product_id: product.id,
      product_name: product.name,
      product_image: product.images?.[0] ?? null,
      sku: product.sku ?? null,
      product_snapshot: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        sku: product.sku ?? null,
        images: product.images,
        price: product.price,
        original_price: product.original_price,
        category_id: product.category_id,
      },
      unit_price: unitPrice,
      quantity: item.quantity,
      discount_amount: 0,
      discount: 0,
      tax: 0,
      line_total: unitPrice * item.quantity,
    };
  });
}

export function isPreparedProviderOrder(value: unknown): value is PaymentProviderOrder {
  if (!value || typeof value !== 'object') return false;
  const order = value as Record<string, unknown>;
  return (
    typeof order.gatewayOrderId === 'string' &&
    order.gatewayOrderId.length > 0 &&
    typeof order.amountPaise === 'number' &&
    Number.isSafeInteger(order.amountPaise) &&
    order.currency === 'INR' &&
    typeof order.metadata === 'object'
  );
}

export function getRazorpayConfigurationError({
  provider,
  publicKeyId,
  serverKeyId,
  serverKeySecret,
}: {
  provider: string;
  publicKeyId?: string;
  serverKeyId?: string;
  serverKeySecret?: string;
}) {
  if (provider !== 'razorpay') return null;
  if (!serverKeyId || !serverKeySecret || !publicKeyId) return 'razorpay_not_configured';
  if (publicKeyId !== serverKeyId) return 'razorpay_key_mismatch';
  return null;
}

export function getRazorpayOrderValidationError({
  amountPaise,
  currency,
  receipt,
}: {
  amountPaise: number;
  currency: string;
  receipt: string;
}) {
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) return 'invalid_razorpay_amount';
  if (currency !== 'INR') return 'invalid_razorpay_currency';
  if (!receipt.trim() || receipt.length > 40) return 'invalid_razorpay_receipt';
  return null;
}

export function getRazorpayOrderResponseError({
  expectedAmountPaise,
  actualAmountPaise,
  expectedCurrency,
  actualCurrency,
}: {
  expectedAmountPaise: number;
  actualAmountPaise: number;
  expectedCurrency: string;
  actualCurrency: string;
}) {
  if (actualAmountPaise !== expectedAmountPaise) return 'razorpay_order_amount_mismatch';
  if (actualCurrency !== expectedCurrency) return 'razorpay_order_currency_mismatch';
  return null;
}

export function sanitizeRazorpayNotes(notes?: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(notes ?? {}).filter(
      ([, value]) => typeof value === 'string' && value.trim().length > 0
    )
  );
}

export function buildRazorpayOrderPayload(input: PaymentProviderOrderInput) {
  return {
    amount: input.amountPaise,
    currency: input.currency,
    receipt: input.receipt,
    notes: sanitizeRazorpayNotes({
      internal_order_id: input.internalOrderId,
      checkout_reference: input.receipt,
      ...(input.notes ?? {}),
    }),
  };
}

export function getCheckoutResumeDecision({
  orderStatus,
  paymentStatus,
}: {
  orderStatus: string;
  paymentStatus: string;
}): 'resume' | 'in_progress' | 'not_payable' {
  if (paymentStatus === 'captured' || orderStatus === 'placed') return 'not_payable';
  if (orderStatus === 'payment_processing') return 'in_progress';
  return 'resume';
}

export function getPaymentAttemptDecision({
  status,
  hasProviderOrder,
  hasPayment,
}: {
  status: string;
  hasProviderOrder: boolean;
  hasPayment: boolean;
}): 'reuse' | 'retry' | 'in_progress' {
  if (hasProviderOrder && hasPayment) return 'reuse';
  if (hasProviderOrder || status === 'failed') return 'retry';
  return 'in_progress';
}

export function getPreparedCheckoutState(expiresAt: string) {
  return {
    payment_status: 'pending' as const,
    order_status: 'pending_payment' as const,
    stock_reserved_until: expiresAt,
  };
}

export function getFailedCheckoutState(publicError: string) {
  return {
    payment_status: 'failed' as const,
    order_status: 'pending_payment' as const,
    payment_failure_reason: publicError,
  };
}

export function shouldCommitCheckoutInventory({
  paymentCaptured,
  inventoryCommittedAt,
}: {
  paymentCaptured: boolean;
  inventoryCommittedAt?: string | null;
}) {
  return paymentCaptured && !inventoryCommittedAt;
}
