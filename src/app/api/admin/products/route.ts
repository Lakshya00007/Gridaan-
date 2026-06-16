import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/supabase/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { assertJsonRequest, assertSameOrigin, errorResponse } from '@/lib/api';
import { productSchema } from '@/lib/validators';

const PRODUCT_SELECT =
  'id, slug, name, description, price, original_price, discount, images, category_id, tags, in_stock, stock_count, rating, review_count, is_trending, is_new_arrival, is_best_seller, metadata, created_at, updated_at, category:categories(*)';

export async function POST(req: NextRequest) {
  try {
    assertJsonRequest(req);
    assertSameOrigin(req);
    await requireAdmin();

    const input = productSchema.parse(await req.json());
    const supabase = createServiceClient();

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        ...input,
        category_id: input.category_id || null,
      })
      .select(PRODUCT_SELECT)
      .single();

    if (error) throw error;

    revalidatePath('/admin/products');
    revalidatePath('/');
    revalidatePath('/shop');

    return NextResponse.json({ product });
  } catch (err) {
    return errorResponse(err);
  }
}
