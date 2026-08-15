import { after, NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api';
import { ensureMetaPurchaseEvent } from '@/lib/analytics/meta-capi.server';
import { recordWebhookEvent, type MetaPurchaseJob } from '@/lib/payments/payment-service';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const eventId = req.headers.get('x-razorpay-event-id');
    const result = await recordWebhookEvent({ rawBody, signature, eventId });
    const { metaPurchaseJobs = [], ...responseResult } = result as Awaited<
      ReturnType<typeof recordWebhookEvent>
    > & { metaPurchaseJobs?: MetaPurchaseJob[] };

    for (const job of metaPurchaseJobs) {
      after(async () => {
        await ensureMetaPurchaseEvent({
          orderId: job.orderId,
          source: job.source,
        });
      });
    }

    return NextResponse.json({
      ok: true,
      ...responseResult,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
