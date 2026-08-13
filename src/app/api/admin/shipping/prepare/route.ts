import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { writeAdminAuditLog } from '@/lib/admin/audit';
import { assertJsonRequest, assertSameOrigin, errorResponse } from '@/lib/api';
import { createServiceClient } from '@/lib/supabase/server';
import { packageDetailsSchema } from '@/lib/shipping/package';
import { createOutboundShipmentDraft } from '@/lib/shipping/shipping-service';
import { ShippingError, toSafeShippingError } from '@/lib/shipping/errors';

const prepareSchema = z.object({
  order_id: z.string().uuid(),
  package: packageDetailsSchema,
  idempotency_key: z.string().trim().min(8).max(160).optional(),
});

export async function POST(req: NextRequest) {
  const requestId = randomUUID();

  try {
    assertJsonRequest(req);
    assertSameOrigin(req);

    const admin = await requireAdminPermission('shipping.write');
    const input = prepareSchema.parse(await req.json());
    const supabase = createServiceClient();
    const shipment = await createOutboundShipmentDraft({
      orderId: input.order_id,
      packageDetails: input.package,
      createdBy: admin.profile.id,
      idempotencyKey: input.idempotency_key ?? `admin:${admin.profile.id}:${input.order_id}:${requestId}`,
    });

    await writeAdminAuditLog({
      supabase,
      adminId: admin.profile.id,
      action: 'shipping.outbound_draft_created',
      entity: 'shipment',
      entityId: shipment?.id ?? null,
      afterData: shipment,
      metadata: {
        order_id: input.order_id,
        provider: 'nimbuspost',
        request_id: requestId,
      },
    });

    revalidatePath('/admin/shipping');
    revalidatePath(`/admin/orders/${input.order_id}`);

    return NextResponse.json({ shipment, request_id: requestId });
  } catch (err) {
    if (err instanceof ShippingError) {
      return NextResponse.json(toSafeShippingError(err, requestId), { status: err.status });
    }
    return errorResponse(err);
  }
}
