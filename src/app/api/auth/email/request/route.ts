import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { assertJsonRequest, assertSameOrigin, errorResponse } from '@/lib/api';
import { emailOtpRequestSchema } from '@/lib/auth/email-otp';
import { createClient } from '@/lib/supabase/server';
import { getClientIdentifier, isRateLimited } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    assertJsonRequest(req);
    assertSameOrigin(req);
    const { email } = emailOtpRequestSchema.parse(await req.json());
    const emailKey = createHash('sha256').update(email).digest('hex');
    if (
      isRateLimited(`otp-request:${getClientIdentifier(req)}`, { limit: 10, windowSec: 600 }) ||
      isRateLimited(`otp-email:${emailKey}`, { limit: 1, windowSec: 60 })
    ) {
      return NextResponse.json({ error: 'Please wait a minute before requesting another code.' }, {
        status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
      });
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) {
      return NextResponse.json({ error: 'We could not send a code. Please wait a minute and try again.' }, {
        status: error.status === 429 ? 429 : 503, headers: { 'Cache-Control': 'no-store' },
      });
    }
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
