import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from '@/lib/api';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { getPaymentById } from '@/lib/payments/payment-service';

const paramsSchema = z.object({
  paymentId: z.string().uuid(),
});

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ paymentId: string }> }
) {
  try {
    await requireAdminPermission('payments.read');
    const { paymentId } = paramsSchema.parse(await context.params);
    const payment = await getPaymentById(paymentId);

    return NextResponse.json({ payment });
  } catch (error) {
    return errorResponse(error);
  }
}
