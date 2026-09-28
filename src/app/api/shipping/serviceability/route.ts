import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertJsonRequest, assertSameOrigin, errorResponse } from '@/lib/api';
import { getClientIdentifier, isRateLimited } from '@/lib/rate-limit';
import { getNimbusPostReadiness } from '@/lib/shipping/config';
import { createNimbusPostClient } from '@/lib/shipping/providers/nimbuspost/client';

const serviceabilitySchema = z.object({
  pincode: z.string().trim().regex(/^\d{6}$/, 'PIN must be 6 digits'),
});

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  const clientId = getClientIdentifier(req);
  if (isRateLimited(`shipping-serviceability:${clientId}`, { limit: 20, windowSec: 60 })) {
    return NextResponse.json(
      {
        status: 'temporarily_unable_to_check',
        error: 'provider_rate_limited',
        request_id: requestId,
      },
      { status: 429 }
    );
  }

  try {
    assertJsonRequest(req);
    assertSameOrigin(req);
    const input = serviceabilitySchema.parse(await req.json());
    const readiness = getNimbusPostReadiness();

    if (!readiness.canCheckServiceability) {
      return NextResponse.json({
        status: 'temporarily_unable_to_check',
        provider: 'nimbuspost',
        pincode: input.pincode,
        checked_at: new Date().toISOString(),
        request_id: requestId,
        message: readiness.enabled
          ? 'Shipping serviceability is not configured yet.'
          : 'Shipping serviceability is currently disabled.',
      });
    }

    try {
      const result = await createNimbusPostClient().checkServiceability({
        destination: { pincode: input.pincode, city: '', state: '', country: 'India' },
      });
      return NextResponse.json({
        status: result.status,
        provider: result.provider,
        pincode: result.pincode,
        checked_at: result.checkedAt,
        request_id: requestId,
        message: result.message,
      });
    } catch {
      return NextResponse.json({
        status: 'temporarily_unable_to_check',
        provider: 'nimbuspost',
        pincode: input.pincode,
        checked_at: new Date().toISOString(),
        request_id: requestId,
        message: 'Shipping serviceability is temporarily unavailable.',
      });
    }
  } catch (err) {
    return errorResponse(err);
  }
}
