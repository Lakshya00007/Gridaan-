import { NextRequest, NextResponse } from 'next/server';
import { assertJsonRequest, assertSameOrigin, errorResponse } from '@/lib/api';
import { emailOtpVerifySchema, hasVerifiedEmail } from '@/lib/auth/email-otp';
import { createClient } from '@/lib/supabase/server';
import { getClientIdentifier, isRateLimited } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    assertJsonRequest(req);
    assertSameOrigin(req);
    const input = emailOtpVerifySchema.parse(await req.json());
    if (isRateLimited(`otp-verify:${getClientIdentifier(req)}`, { limit: 10, windowSec: 600 })) {
      return NextResponse.json({ error: 'Too many attempts. Please wait before trying again.' }, {
        status: 429, headers: { 'Retry-After': '600', 'Cache-Control': 'no-store' },
      });
    }
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ ...input, type: 'email' });
    if (error || !data.session || !hasVerifiedEmail(data.user)) {
      return NextResponse.json({ error: 'That code is invalid or expired. Check the code or request a new one.' }, {
        status: 400, headers: { 'Cache-Control': 'no-store' },
      });
    }
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
