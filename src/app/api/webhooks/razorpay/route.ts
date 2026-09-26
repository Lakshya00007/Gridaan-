import { after, NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api';
import { ensureMetaPurchaseEvent } from '@/lib/analytics/meta-capi.server';
import { recordWebhookEvent, type MetaPurchaseJob } from '@/lib/payments/payment-service';
import { sendOrderEmailEvent } from '@/lib/email/service';

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
        await Promise.all([
          sendOrderEmailEvent({ orderId: job.orderId, eventType: 'order_confirmation' }),
          sendOrderEmailEvent({ orderId: job.orderId, eventType: 'admin_new_order' }),
        ]);
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
