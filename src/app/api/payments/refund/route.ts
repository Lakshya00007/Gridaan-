import { NextRequest, NextResponse } from 'next/server';
import { assertJsonRequest, assertSameOrigin, errorResponse } from '@/lib/api';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { refundRequestSchema } from '@/lib/payments/payment-validation';
import { createRefundPlaceholder } from '@/lib/payments/payment-service';

export async function POST(req: NextRequest) {
  try {
    assertJsonRequest(req);
    assertSameOrigin(req);

    const admin = await requireAdminPermission('refunds.write');
    const input = refundRequestSchema.parse(await req.json());

    const result = await createRefundPlaceholder({
      paymentId: input.payment_id,
      amountPaise: input.amount_paise,
      reason: input.reason,
      notes: input.notes,
      idempotencyKey: input.idempotency_key,
      adminId: admin.profile.id,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      message: 'Refund placeholder created. No live Razorpay refund API call was made.',
    });
  } catch (error) {
    return errorResponse(error);
  }
}
