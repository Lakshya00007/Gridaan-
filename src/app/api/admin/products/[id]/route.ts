import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/supabase/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { assertJsonRequest, assertSameOrigin, errorResponse, notFound } from '@/lib/api';
import { productSchema } from '@/lib/validators';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const PRODUCT_SELECT =
  'id, slug, name, description, price, original_price, discount, images, category_id, tags, in_stock, stock_count, rating, review_count, is_trending, is_new_arrival, is_best_seller, metadata, created_at, updated_at, category:categories(*)';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    assertJsonRequest(req);
    assertSameOrigin(req);
    await requireAdmin();

    const { id } = paramsSchema.parse(await context.params);
    const input = productSchema.parse(await req.json());
    const supabase = createServiceClient();

    const { data: product, error } = await supabase
      .from('products')
      .update({
        ...input,
        category_id: input.category_id || null,
      })
      .eq('id', id)
      .select(PRODUCT_SELECT)
      .maybeSingle();

    if (error) throw error;
    if (!product) throw notFound('Product not found');

    revalidatePath('/admin/products');
    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath(`/product/${product.slug}`);

    return NextResponse.json({ product });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(req);
    await requireAdmin();

    const { id } = paramsSchema.parse(await context.params);
    const supabase = createServiceClient();

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/admin/products');
    revalidatePath('/');
    revalidatePath('/shop');

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
