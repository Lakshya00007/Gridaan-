import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSafeAuthRedirect } from '@/lib/auth-navigation';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = getSafeAuthRedirect(url.searchParams.get('next'), '/account');
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=oauth_callback_failed', origin));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[auth/callback] OAuth exchange failed', { code: error.code });
      return NextResponse.redirect(new URL('/login?error=oauth_callback_failed', origin));
    }

    return NextResponse.redirect(new URL(next, origin));
  } catch {
    console.error('[auth/callback] Unexpected OAuth callback failure');
    return NextResponse.redirect(new URL('/login?error=oauth_callback_failed', origin));
  }
}
