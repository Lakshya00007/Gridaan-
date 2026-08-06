import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { writeAdminAuditLog } from '@/lib/admin/audit';
import { createServiceClient } from '@/lib/supabase/server';
import { assertJsonRequest, assertSameOrigin, errorResponse } from '@/lib/api';
import { productSchema } from '@/lib/validators';

const PRODUCT_SELECT = '*, category:categories(*)';

export async function POST(req: NextRequest) {
  try {
    assertJsonRequest(req);
    assertSameOrigin(req);
    const admin = await requireAdminPermission('products.write');

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
    return errorResponse(err);
  }
}
