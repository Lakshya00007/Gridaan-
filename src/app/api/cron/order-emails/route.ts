import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { serverEnv } from '@/lib/env.server';
import { sendOrderEmailEvent, type OrderEmailEvent } from '@/lib/email/service';

export const dynamic = 'force-dynamic';

function authorized(request: NextRequest) {
  const expected = serverEnv.CRON_SECRET;
  const actual = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!expected || !actual) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Reconcile queued and retryable order email tasks. Never expose this publicly. */
export async function GET(request: NextRequest) {
  if (!serverEnv.CRON_SECRET) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  if (!authorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('order_email_events')
    .select('order_id, event_type')
    .in('status', ['pending', 'failed', 'processing'])
    .lt('attempt_count', 5)
    .or(`last_attempt_at.is.null,last_attempt_at.gt.${cutoff}`)
    .order('created_at', { ascending: true })
    .limit(10);
  if (error) {
    console.error('[email-cron] queue read failed', error.message);
    return NextResponse.json({ error: 'queue_read_failed' }, { status: 503 });
  }

  const results = await Promise.allSettled((data ?? []).map((row) =>
    sendOrderEmailEvent({ orderId: row.order_id, eventType: row.event_type as OrderEmailEvent })
  ));
  const failed = results.filter((result) => result.status === 'rejected' ||
    (result.status === 'fulfilled' && !result.value.sent && !result.value.skipped)).length;
  return NextResponse.json({ checked: results.length, failed }, { headers: { 'Cache-Control': 'no-store' } });
}
