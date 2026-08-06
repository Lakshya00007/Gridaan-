import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api';
import { recordWebhookEvent } from '@/lib/payments/payment-service';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const eventId = req.headers.get('x-razorpay-event-id');
    const result = await recordWebhookEvent({ rawBody, signature, eventId });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
