import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkoutSchema } from '@/lib/validators';
import { computeCartTotals } from '@/lib/cart-totals';
import { assertJsonRequest, assertSameOrigin, errorResponse, badRequest, notFound } from '@/lib/api';
import { getProfile } from '@/lib/supabase/auth';
import type { Coupon, OrderSuccessSummary, Product } from '@/types';
import type { PostgrestError } from '@supabase/supabase-js';
import { isRateLimited, getClientIdentifier } from '@/lib/rate-limit';
import { publicEnv } from '@/lib/env.public';

const PRODUCT_COLS =
  'id, slug, name, description, price, original_price, discount, images, category_id, tags, in_stock, stock_count, rating, review_count, is_trending, is_new_arrival, is_best_seller, metadata, created_at, updated_at, category:categories(*)';

type CouponForTotals = Pick<Coupon, 'type' | 'value' | 'min_order' | 'max_discount'>;

type ValidateCouponRow = {
  ok: boolean;
  coupon_code: string | null;
};

type OrderCreationResponse = {
  order: OrderSuccessSummary;
  rzp_order?: {
    id: string;
    amount: number;
    currency: string;
  };
  rzp_key?: string;
  retryable?: boolean;
  message?: string;
};
/**
 * POST /api/orders
 *
 * Auth: optional. Both guests and authenticated users can place orders.
 * Steps:
 *   1. Validate input.
 *   2. Re-fetch product prices/stock to avoid client tampering.
 *   3. Compute totals (incl. coupon) using the same logic as the cart.
 *   4. Persist order via SECURITY DEFINER `create_order` RPC. The RPC
 *      atomically inserts the order + items and decrements stock.
 *   5. If payment is Razorpay, also create a Razorpay order and return
 *      the order_id + key for the checkout modal.
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
    let coupon: CouponForTotals | null = null;
    if (input.coupon_code) {
      const { data: couponData, error: couponError } = await supabase.rpc('validate_coupon', {
        p_code: input.coupon_code,
        p_subtotal: input.items.reduce((a, it) => a + (byId.get(it.product_id)?.price ?? 0) * it.quantity, 0),
      });
      if (couponError) throw couponError;
      const validationRows = (couponData ?? []) as ValidateCouponRow[];
      if (validationRows[0]?.ok && validationRows[0].coupon_code) {
        // Re-fetch the actual coupon row to keep type fidelity
        const { data: crow } = await supabase
          .from('coupons')
          .select('type, value, min_order, max_discount')
          .eq('code', validationRows[0].coupon_code)
        .single();
      if (crow) coupon = crow as CouponForTotals;
    }
    }

    const totals = computeCartTotals({
      items: input.items.map((it) => {
        const p = byId.get(it.product_id)!;
        return { product_id: it.product_id, quantity: it.quantity, product: p };
      }),
      coupon,
    });

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
      razorpay_order_id: order.razorpay_order_id,
      created_at: order.created_at,
    };

    console.info('[orders] app order creation response', {
      orderId: orderSummary.id,
      orderNumber: orderSummary.order_number,
      paymentMethod: orderSummary.payment_method,
      paymentStatus: orderSummary.payment_status,
    });

    // If payment is razorpay, create a Razorpay order server-side
    if (input.payment_method === 'razorpay') {
      try {
        const { createRzpOrder } = await import('@/lib/razorpay');
        const rzp = await createRzpOrder({
          amount: totals.total * 100, // paise
          receipt: order.order_number,
          notes: { order_id: order.id },
        });
        const { error: updateError } = await supabase
          .from('orders')
          .update({ razorpay_order_id: rzp.id })
          .eq('id', order.id);
        if (updateError) throw updateError;

        console.info('[orders] Razorpay create order response', {
          orderNumber: order.order_number,
          razorpayOrderId: rzp.id,
          amount: Number(rzp.amount),
          currency: rzp.currency,
        });

        const payload: OrderCreationResponse = {
          order: { ...orderSummary, razorpay_order_id: rzp.id },
          rzp_order: { id: rzp.id, amount: Number(rzp.amount), currency: rzp.currency },
          rzp_key: publicEnv.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        };

        return NextResponse.json(payload);
      } catch (razorpayError) {
        console.error('[orders] failed to initialize Razorpay order', {
          orderId: order.id,
          orderNumber: order.order_number,
          error: razorpayError,
        });

        const payload: OrderCreationResponse = {
          order: orderSummary,
          retryable: true,
          message:
            'Your order was created, but Razorpay could not start. Please retry payment from the order confirmation page.',
        };

        return NextResponse.json(payload, { status: 502 });
      }
    }

    // COD: just return the order
    const payload: OrderCreationResponse = { order: orderSummary };
    return NextResponse.json(payload);
  } catch (err) {
    return errorResponse(err as Error | PostgrestError);
  }
}
