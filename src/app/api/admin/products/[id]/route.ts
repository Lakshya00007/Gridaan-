import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { writeAdminAuditLog } from '@/lib/admin/audit';
import { createServiceClient } from '@/lib/supabase/server';
import { assertJsonRequest, assertSameOrigin, errorResponse, notFound } from '@/lib/api';
import { productSchema } from '@/lib/validators';
import { deleteManagedProductImageUrls } from '@/lib/r2/client';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const PRODUCT_SELECT = '*, category:categories(*)';

function getRemovedImages(before: unknown, after: unknown) {
  const beforeImages = Array.isArray(before) ? before.filter((url): url is string => typeof url === 'string') : [];
  const afterImages = new Set(
    Array.isArray(after) ? after.filter((url): url is string => typeof url === 'string') : []
  );

  return beforeImages.filter((url) => !afterImages.has(url));
}

async function deleteManagedImagesSafely(urls: string[], context: string) {
  if (urls.length === 0) return;
  try {
    await deleteManagedProductImageUrls(urls);
  } catch (error) {
    console.warn(`[admin/products] R2 ${context} cleanup failed`, {
      image_count: urls.length,
      error: error instanceof Error ? error.name : 'unknown',
    });
  }
}

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

    await deleteManagedImagesSafely(
      getRemovedImages(
        (before as { images?: unknown } | null)?.images,
        (product as { images?: unknown }).images
      ),
      'removed-image'
    );

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

    await deleteManagedImagesSafely(
      Array.isArray((before as { images?: unknown } | null)?.images)
        ? ((before as { images: string[] }).images)
        : [],
      'product-delete'
    );

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
