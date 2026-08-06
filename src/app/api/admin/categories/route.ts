import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { writeAdminAuditLog } from '@/lib/admin/audit';
import { createServiceClient } from '@/lib/supabase/server';
import { assertJsonRequest, assertSameOrigin, errorResponse } from '@/lib/api';
import { categorySchema } from '@/lib/validators';

export async function POST(req: NextRequest) {
  try {
    assertJsonRequest(req);
    assertSameOrigin(req);
    const admin = await requireAdminPermission('categories.write');

    const input = categorySchema.parse(await req.json());
    const supabase = createServiceClient();

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        ...input,
        description: input.description || null,
        image_url: input.image_url || null,
        icon: input.icon || null,
      })
      .select('*')
      .single();

    if (error) throw error;

    await writeAdminAuditLog({
      supabase,
      adminId: admin.profile.id,
      action: 'category.created',
      entity: 'category',
      entityId: category.id,
      afterData: category,
    });

    revalidatePath('/admin/categories');
    revalidatePath('/');
    revalidatePath('/shop');

    return NextResponse.json({ category });
  } catch (err) {
    return errorResponse(err);
  }
}
