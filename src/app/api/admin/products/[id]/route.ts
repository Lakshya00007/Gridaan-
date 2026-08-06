import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { writeAdminAuditLog } from '@/lib/admin/audit';
import { createServiceClient } from '@/lib/supabase/server';
import { assertJsonRequest, assertSameOrigin, errorResponse, notFound } from '@/lib/api';
import { productSchema } from '@/lib/validators';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const PRODUCT_SELECT = '*, category:categories(*)';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    assertJsonRequest(req);
    assertSameOrigin(req);
    const admin = await requireAdminPermission('products.write');

    const { id } = paramsSchema.parse(await context.params);
    const input = productSchema.parse(await req.json());
    const supabase = createServiceClient();
    const { data: before } = await supabase.from('products').select(PRODUCT_SELECT).eq('id', id).maybeSingle();

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

    await writeAdminAuditLog({
      supabase,
      adminId: admin.profile.id,
      action: 'product.updated',
      entity: 'product',
      entityId: id,
      beforeData: before,
      afterData: product,
    });

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
    const admin = await requireAdminPermission('products.write');

    const { id } = paramsSchema.parse(await context.params);
    const supabase = createServiceClient();
    const { data: before } = await supabase.from('products').select(PRODUCT_SELECT).eq('id', id).maybeSingle();

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;

    await writeAdminAuditLog({
      supabase,
      adminId: admin.profile.id,
      action: 'product.deleted',
      entity: 'product',
      entityId: id,
      beforeData: before,
    });

    revalidatePath('/admin/products');
    revalidatePath('/');
    revalidatePath('/shop');

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
