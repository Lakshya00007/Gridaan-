import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/supabase/auth';
import {
  assertJsonRequest,
  assertSameOrigin,
  badRequest,
  errorResponse,
  forbidden,
  notFound,
  unauthorized,
} from '@/lib/api';
import { revalidatePath } from 'next/cache';

const updateSchema = z.union([
  z.object({
    order_status: z.enum(['placed', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned']),
  }),
  z.object({
    payment_action: z.enum(['mark_paid', 'reject']),
    rejection_reason: z.string().trim().max(500).optional(),
  }),
]);
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

    const profile = await getProfile();
    if (!profile) throw unauthorized();
    if (!profile.is_admin) throw forbidden();
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

    const manualPayment =
      order.payment_method === 'manual_upi' || order.payment_method === 'bank_transfer';

    if ('payment_action' in input) {
      if (!manualPayment) {
        throw badRequest(
          'Payment review actions are only available for manual UPI or bank transfer orders',
          'invalid_payment_method'
        );
      }
      if (order.payment_status !== 'pending') {
        throw badRequest('This payment is no longer pending review', 'payment_not_pending');
      }
      if (order.order_status === 'cancelled' || order.order_status === 'returned') {
        throw badRequest(
          'A cancelled or returned order cannot be approved for payment',
          'invalid_status_transition'
        );
      }

      const nextOrderStatus =
        input.payment_action === 'mark_paid'
          ? order.order_status === 'placed'
            ? 'confirmed'
            : order.order_status
          : 'cancelled';
      const update =
        input.payment_action === 'mark_paid'
          ? {
              payment_status: 'paid',
              manual_payment_verified_at: new Date().toISOString(),
              manual_payment_verified_by: profile.id,
              manual_payment_rejected_reason: null,
              order_status: nextOrderStatus,
              updated_at: new Date().toISOString(),
            }
          : {
              payment_status: 'failed',
              manual_payment_verified_at: null,
              manual_payment_verified_by: null,
              manual_payment_rejected_reason: input.rejection_reason?.trim() || null,
              order_status: nextOrderStatus,
              updated_at: new Date().toISOString(),
            };

      const { data: paymentUpdate, error: paymentUpdateError } = await supabase
        .from('orders')
        .update(update)
        .eq('id', id)
        .eq('payment_status', 'pending')
        .select('id')
        .maybeSingle();
      if (paymentUpdateError) throw paymentUpdateError;
      if (!paymentUpdate) {
        throw badRequest(
          'This payment was reviewed by another administrator',
          'payment_not_pending'
        );
      }

      if (nextOrderStatus !== order.order_status) {
        const { error: historyError } = await supabase.from('order_status_history').insert({
          order_id: id,
          from_status: order.order_status,
          to_status: nextOrderStatus,
          changed_by: profile.id,
          note:
            input.payment_action === 'mark_paid'
              ? 'Manual payment verified against actual account credit'
              : input.rejection_reason?.trim() || 'Manual payment rejected',
        });
        if (historyError) {
          console.warn('[admin/orders] Payment review history insert failed:', historyError);
        }
      }

      const { data: updated, error: updatedError } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', id)
        .single();
      if (updatedError) throw updatedError;

      revalidatePath('/admin/orders');
      revalidatePath('/order-success');

      return NextResponse.json({ order: updated });
    }

    const { order_status } = input;

    if (order.order_status === order_status) {
      return NextResponse.json({ order });
    }

    if (
      manualPayment &&
      order.payment_status === 'pending' &&
      (order_status === 'confirmed' || order_status === 'shipped' || order_status === 'delivered')
    ) {
      throw badRequest(
        'Verify the manual payment before advancing this order',
        'payment_verification_required'
      );
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
    const { data: updated, error: updatedError } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', id)
      .single();
    if (updatedError) throw updatedError;

    revalidatePath('/admin/orders');

    return NextResponse.json({ order: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
