import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { assertJsonRequest, assertSameOrigin, errorResponse } from '@/lib/api';
import { getShipmentRates } from '@/lib/shipping/shipping-service';
import { ShippingError, toSafeShippingError } from '@/lib/shipping/errors';

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  try {
    assertJsonRequest(req);
    assertSameOrigin(req);
    await requireAdminPermission('shipping.read');
    const { shipment_id } = z.object({ shipment_id: z.string().uuid() }).parse(await req.json());
    return NextResponse.json({ rates: await getShipmentRates(shipment_id), request_id: requestId });
  } catch (error) {
    if (error instanceof ShippingError) return NextResponse.json(toSafeShippingError(error, requestId), { status: error.status });
    return errorResponse(error);
  }
}
