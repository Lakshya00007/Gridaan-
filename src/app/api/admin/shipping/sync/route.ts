import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { assertJsonRequest, assertSameOrigin, errorResponse } from '@/lib/api';
import { syncOutboundShipmentTracking } from '@/lib/shipping/shipping-service';
import { ShippingError, toSafeShippingError } from '@/lib/shipping/errors';

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  try {
    assertJsonRequest(req);
    assertSameOrigin(req);
    await requireAdminPermission('shipping.write');
    const { shipment_id } = z.object({ shipment_id: z.string().uuid() }).parse(await req.json());
    const shipment = await syncOutboundShipmentTracking(shipment_id);
    revalidatePath('/admin/shipping');
    revalidatePath(`/admin/orders/${shipment.order_id}`);
    return NextResponse.json({ shipment, request_id: requestId });
  } catch (error) {
    if (error instanceof ShippingError) return NextResponse.json(toSafeShippingError(error, requestId), { status: error.status });
    return errorResponse(error);
  }
}
