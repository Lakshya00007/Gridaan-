import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { writeAdminAuditLog } from '@/lib/admin/audit';
import { assertJsonRequest, assertSameOrigin, errorResponse } from '@/lib/api';
import { createServiceClient } from '@/lib/supabase/server';
import { bookOutboundShipment } from '@/lib/shipping/shipping-service';
import { ShippingError, toSafeShippingError } from '@/lib/shipping/errors';

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  try {
    assertJsonRequest(req);
    assertSameOrigin(req);
    const admin = await requireAdminPermission('shipping.write');
    const input = z.object({
      shipment_id: z.string().uuid(),
      courier_id: z.string().trim().min(1),
      maximum_charge: z.number().finite().nonnegative(),
    }).parse(await req.json());
    const shipment = await bookOutboundShipment({ shipmentId: input.shipment_id, courierId: input.courier_id, maximumCharge: input.maximum_charge });
    await writeAdminAuditLog({
      supabase: createServiceClient(),
      adminId: admin.profile.id,
      action: 'shipping.outbound_booked',
      entity: 'shipment',
      entityId: shipment.id,
      afterData: shipment,
      metadata: { order_id: shipment.order_id, request_id: requestId },
    });
    revalidatePath('/admin/shipping');
    revalidatePath(`/admin/orders/${shipment.order_id}`);
    return NextResponse.json({ shipment, request_id: requestId });
  } catch (error) {
    if (error instanceof ShippingError) return NextResponse.json(toSafeShippingError(error, requestId), { status: error.status });
    return errorResponse(error);
  }
}
