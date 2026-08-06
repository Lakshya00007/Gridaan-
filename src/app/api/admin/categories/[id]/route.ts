import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { writeAdminAuditLog } from '@/lib/admin/audit';
import { createServiceClient } from '@/lib/supabase/server';
import { assertJsonRequest, assertSameOrigin, errorResponse, notFound } from '@/lib/api';
import { categorySchema } from '@/lib/validators';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    assertJsonRequest(req);
    assertSameOrigin(req);
    const admin = await requireAdminPermission('categories.write');

    const { id } = paramsSchema.parse(await context.params);
    const input = categorySchema.parse(await req.json());
    const supabase = createServiceClient();
    const { data: before } = await supabase.from('categories').select('*').eq('id', id).maybeSingle();

    const { data: category, error } = await supabase
      .from('categories')
      .update({
        ...input,
        description: input.description || null,
        image_url: input.image_url || null,
        icon: input.icon || null,
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    if (!category) throw notFound('Category not found');

    await writeAdminAuditLog({
      supabase,
      adminId: admin.profile.id,
      action: 'category.updated',
      entity: 'category',
      entityId: id,
      beforeData: before,
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

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(req);
    const admin = await requireAdminPermission('categories.write');

    const { id } = paramsSchema.parse(await context.params);
    const supabase = createServiceClient();
    const { data: before } = await supabase.from('categories').select('*').eq('id', id).maybeSingle();

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;

    await writeAdminAuditLog({
      supabase,
      adminId: admin.profile.id,
      action: 'category.deleted',
      entity: 'category',
      entityId: id,
      beforeData: before,
    });

    revalidatePath('/admin/categories');
    revalidatePath('/');
    revalidatePath('/shop');

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
