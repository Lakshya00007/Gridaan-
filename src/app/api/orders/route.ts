import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkoutSchema } from '@/lib/validators';
import { assertJsonRequest, assertSameOrigin, errorResponse, badRequest, notFound } from '@/lib/api';
import { getProfile } from '@/lib/supabase/auth';
import type { OrderSuccessSummary, Product } from '@/types';
import type { PostgrestError } from '@supabase/supabase-js';
import { isRateLimited, getClientIdentifier } from '@/lib/rate-limit';
import { bankTransferAvailable, manualUpiAvailable } from '@/lib/manual-payment';

const PRODUCT_COLS =
  'id, slug, name, description, price, original_price, discount, images, category_id, tags, in_stock, stock_count, rating, review_count, is_trending, is_new_arrival, is_best_seller, metadata, created_at, updated_at, category:categories(*)';

type ValidateCouponRow = {
  ok: boolean;
  reason: string | null;
  coupon_code: string | null;
};

type OrderCreationResponse = {
  order: OrderSuccessSummary;
};
/**
 * POST /api/orders
 *
 * Auth: optional. Both guests and authenticated users can place orders.
 * Steps:
 *   1. Validate input.
 *   2. Re-fetch product prices/stock to avoid client tampering.
 *   3. Validate any coupon server-side.
 *   4. Persist order via SECURITY DEFINER `create_order` RPC. The RPC
 *      atomically inserts the order + items and decrements stock.
 */
export async function POST(req: NextRequest) {
  // Rate limiting: max 5 orders per minute per client
  const clientId = getClientIdentifier(req);
  if (isRateLimited(clientId, { limit: 5, windowSec: 60 })) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    assertJsonRequest(req);
    assertSameOrigin(req);

    const body = await req.json();
    const input = checkoutSchema.parse(body);
    const supabase = createServiceClient();
    const profile = await getProfile();

    if (input.payment_method === 'manual_upi' && !manualUpiAvailable) {
      throw badRequest('Manual UPI payment is not available right now', 'payment_method_unavailable');
    }
    if (input.payment_method === 'bank_transfer' && !bankTransferAvailable) {
      throw badRequest('Bank transfer is not available right now', 'payment_method_unavailable');
    }

    console.info('[orders] checkout selected payment method', {
      paymentMethod: input.payment_method,
      itemCount: input.items.length,
    });

    // Re-fetch products server-side
    const ids = input.items.map((i) => i.product_id);
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select(PRODUCT_COLS)
      .in('id', ids);

    if (prodError) throw prodError;
    if (!products || products.length !== ids.length) throw notFound('Some products are unavailable');

    const byId = new Map((products as unknown as Product[]).map((p) => [p.id, p]));

    // Validate stock
    for (const it of input.items) {
      const p = byId.get(it.product_id);
      if (!p) throw notFound(`Product ${it.product_id} not found`);
      if (!p.in_stock || p.stock_count < it.quantity) {
        throw badRequest(`"${p.name}" is out of stock`, 'out_of_stock');
      }
    }

    // Validate coupon server-side (don't trust the client)
    if (input.coupon_code) {
      const { data: couponData, error: couponError } = await supabase.rpc('validate_coupon', {
        p_code: input.coupon_code,
        p_subtotal: input.items.reduce((a, it) => a + (byId.get(it.product_id)?.price ?? 0) * it.quantity, 0),
      });
      if (couponError) throw couponError;
      const validationRows = (couponData ?? []) as ValidateCouponRow[];
      if (!validationRows[0]?.ok) {
        throw badRequest(validationRows[0]?.reason ?? 'Coupon is not valid', 'invalid_coupon');
      }
    }

    // Persist order via SECURITY DEFINER function
    const { data: orderId, error: rpcError } = await supabase.rpc('create_order', {
      p_user_id: profile?.id ?? null,
      p_customer_name: input.customer_name,
      p_customer_email: input.customer_email || null,
      p_customer_phone: input.customer_phone,
      p_address: input.shipping_address,
      p_items: input.items.map((it) => ({ product_id: it.product_id, quantity: it.quantity })),
      p_payment_method: input.payment_method,
      p_coupon_code: input.coupon_code || null,
      p_notes: input.notes || null,
      p_manual_payment_reference: input.manual_payment_reference || null,
      p_manual_payment_sender_name: input.manual_payment_sender_name || null,
      p_manual_payment_note: input.manual_payment_note || null,
    });
    if (rpcError) throw rpcError;

    // Fetch the order we just created (with items)
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', orderId)
      .single();
    if (fetchError) throw fetchError;

    const orderSummary: OrderSuccessSummary = {
      id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      total: order.total,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      order_status: order.order_status,
      manual_payment_reference: order.manual_payment_reference,
      manual_payment_sender_name: order.manual_payment_sender_name,
      manual_payment_note: order.manual_payment_note,
      manual_payment_verified_at: order.manual_payment_verified_at,
      manual_payment_rejected_reason: order.manual_payment_rejected_reason,
      created_at: order.created_at,
    };

    console.info('[orders] app order creation response', {
      orderId: orderSummary.id,
      orderNumber: orderSummary.order_number,
      paymentMethod: orderSummary.payment_method,
      paymentStatus: orderSummary.payment_status,
    });

    const payload: OrderCreationResponse = { order: orderSummary };
    return NextResponse.json(payload);
  } catch (err) {
    return errorResponse(err as Error | PostgrestError);
  }
}
