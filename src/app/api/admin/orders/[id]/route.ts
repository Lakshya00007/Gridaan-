import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';
import { assertJsonRequest, assertSameOrigin, errorResponse, notFound, badRequest } from '@/lib/api';
import { revalidatePath } from 'next/cache';

const updateSchema = z.object({
  order_status: z.enum(['placed', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned']),
});
const paramsSchema = z.object({
  id: z.string().uuid(),
});

/**
 * PATCH /api/admin/orders/[id]
 * Update order status. Admin-only.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    assertJsonRequest(req);
    assertSameOrigin(req);

    // Require admin authentication
    const profile = await requireAdmin();
    const { id } = paramsSchema.parse(await context.params);

    const body = await req.json();
    const { order_status } = updateSchema.parse(body);

    const supabase = createServiceClient();

    // Fetch current order
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_status')
      .eq('id', id)
      .single();

    if (fetchError || !order) {
      throw notFound('Order not found');
    }

    if (order.order_status === order_status) {
      return NextResponse.json({ order });
    }

    const disallowedTransition =
      (order.order_status === 'cancelled' || order.order_status === 'returned') &&
      order_status !== order.order_status;
    if (disallowedTransition) {
      throw badRequest('Cannot change status after cancellation or return', 'invalid_status_transition');
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        order_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Insert status history
    await supabase
      .from('order_status_history')
      .insert({
        order_id: id,
        from_status: order.order_status,
        to_status: order_status,
        changed_by: profile.id,
      })
      .then(({ error }) => {
        if (error) console.warn('[admin/orders] Status history insert failed:', error);
      });

    // Fetch updated order
    const { data: updated } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', id)
      .single();

    revalidatePath('/admin/orders');

    return NextResponse.json({ order: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
