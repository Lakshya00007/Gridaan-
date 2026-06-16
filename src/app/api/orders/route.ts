import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkoutSchema } from '@/lib/validators';
import { computeCartTotals } from '@/lib/cart-totals';
import { errorResponse, badRequest, notFound } from '@/lib/api';
import { getProfile } from '@/lib/supabase/auth';
import type { Coupon, Product } from '@/types';
import type { PostgrestError } from '@supabase/supabase-js';

const PRODUCT_COLS =
  'id, slug, name, description, price, original_price, discount, images, category_id, tags, in_stock, stock_count, rating, review_count, is_trending, is_new_arrival, is_best_seller, metadata, created_at, updated_at, category:categories(*)';

type CouponForTotals = Pick<Coupon, 'type' | 'value' | 'min_order' | 'max_discount'>;

type ValidateCouponRow = {
  ok: boolean;
  coupon_code: string | null;
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
  try {
    const body = await req.json();
    const input = checkoutSchema.parse(body);
    const supabase = await createClient();
    const profile = await getProfile();

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

    // If payment is razorpay, create a Razorpay order server-side
    if (input.payment_method === 'razorpay') {
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

      return NextResponse.json({
        order: { ...order, razorpay_order_id: rzp.id },
        rzp_order: { id: rzp.id, amount: rzp.amount, currency: rzp.currency },
        rzp_key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      });
    }

    // COD: just return the order
    return NextResponse.json({ order });
  } catch (err) {
    return errorResponse(err as Error | PostgrestError);
  }
}
