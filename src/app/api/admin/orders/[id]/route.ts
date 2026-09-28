import { after, NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { writeAdminAuditLog } from '@/lib/admin/audit';
import { validateAdminOrderTransition } from '@/lib/admin/order-transitions';
import {
  assertJsonRequest,
  assertSameOrigin,
  badRequest,
  errorResponse,
  notFound,
} from '@/lib/api';
import { revalidatePath } from 'next/cache';
import { sendOrderEmailEvent } from '@/lib/email/service';

const updateSchema = z.object({
  order_status: z.enum([
    'draft',
    'pending_payment',
    'payment_processing',
    'placed',
    'confirmed',
    'packed',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'return_requested',
    'returned',
  ]),
});
const paramsSchema = z.object({
  id: z.string().uuid(),
});

function emailEventForStatus(status: string) {
  return status === 'shipped' ? 'order_shipped' as const
    : status === 'delivered' ? 'order_delivered' as const
      : status === 'cancelled' ? 'order_cancelled' as const : null;
}

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

    const admin = await requireAdminPermission('orders.write');
    const { id } = paramsSchema.parse(await context.params);

    const input = updateSchema.parse(await req.json());

    const supabase = createServiceClient();

    // Fetch current order
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_status, payment_method, payment_status')
      .eq('id', id)
      .single();

    if (fetchError || !order) {
      throw notFound('Order not found');
    }

    const { order_status } = input;

    if (order.order_status === order_status) {
      const emailEvent = emailEventForStatus(order_status);
      if (emailEvent) after(() => sendOrderEmailEvent({ orderId: id, eventType: emailEvent }));
      return NextResponse.json({ order });
    }

    const transition = validateAdminOrderTransition({
      currentStatus: order.order_status,
      nextStatus: order_status,
      paymentStatus: order.payment_status,
    });
    if (!transition.allowed) {
      throw badRequest(transition.message, transition.code);
    }

    // Update order status
    const now = new Date().toISOString();
    const { data: changed, error: updateError } = await supabase
      .from('orders')
      .update({
        order_status,
        ...(order_status === 'shipped' ? { shipped_at: now } : {}),
        ...(order_status === 'delivered' ? { delivered_at: now } : {}),
        ...(order_status === 'cancelled' ? { cancelled_at: now } : {}),
        updated_at: now,
      })
      .eq('id', id)
      .eq('order_status', order.order_status)
      .select('id')
      .maybeSingle();

    if (updateError) throw updateError;
    if (!changed) throw badRequest('Order status changed. Refresh and try again.', 'order_status_conflict');

    // Insert status history
    await supabase
      .from('order_status_history')
      .insert({
        order_id: id,
        from_status: order.order_status,
        to_status: order_status,
        changed_by: admin.profile.id,
      })
      .then(({ error }) => {
        if (error) console.warn('[admin/orders] Status history insert failed:', error);
      });

    // Fetch updated order
    const { data: updated, error: updatedError } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', id)
      .single();
    if (updatedError) throw updatedError;

    await writeAdminAuditLog({
      supabase,
      adminId: admin.profile.id,
      action: 'order.status_updated',
      entity: 'order',
      entityId: id,
      beforeData: order,
      afterData: updated,
      metadata: {
        from_status: order.order_status,
        to_status: order_status,
      },
    });

    revalidatePath('/admin/orders');
    const emailEvent = emailEventForStatus(order_status);
    if (emailEvent) {
      after(() => sendOrderEmailEvent({ orderId: id, eventType: emailEvent }));
    }

    return NextResponse.json({ order: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
