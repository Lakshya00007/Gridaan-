import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { writeAdminAuditLog } from '@/lib/admin/audit';
import { createServiceClient } from '@/lib/supabase/server';
import { assertJsonRequest, assertSameOrigin, errorResponse } from '@/lib/api';
import { productSchema, type ProductInput } from '@/lib/validators';
import { deleteManagedProductImageUrls } from '@/lib/r2/client';

const PRODUCT_SELECT = '*, category:categories(*)';
const productCreateIdSchema = z.object({
  id: z.string().uuid().optional(),
});
type ProductCreateInput = ProductInput & { id?: string };

export async function POST(req: NextRequest) {
  let input: ProductCreateInput | null = null;
  let insertedProductId: string | null = null;

  try {
    assertJsonRequest(req);
    assertSameOrigin(req);
    const admin = await requireAdminPermission('products.write');

    const body = await req.json();
    const { id } = productCreateIdSchema.parse(body);
    const productInput = productSchema.parse(body);
    input = { ...productInput, id };
    const supabase = createServiceClient();

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        ...(id ? { id } : {}),
        ...productInput,
        category_id: productInput.category_id || null,
      })
      .select(PRODUCT_SELECT)
      .single();

    if (error) throw error;
    insertedProductId = product.id;

    await writeAdminAuditLog({
      supabase,
      adminId: admin.profile.id,
      action: 'product.created',
      entity: 'product',
      entityId: product.id,
      afterData: product,
    });

    revalidatePath('/admin/products');
    revalidatePath('/');
    revalidatePath('/shop');

    return NextResponse.json({ product });
  } catch (err) {
    if (input && !insertedProductId) {
      try {
        await deleteManagedProductImageUrls(input.images);
      } catch (cleanupError) {
        console.warn('[admin/products] R2 cleanup after create failure failed', {
          image_count: input.images.length,
          error: cleanupError instanceof Error ? cleanupError.name : 'unknown',
        });
      }
    }
    return errorResponse(err);
  }
}
