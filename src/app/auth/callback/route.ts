import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function resolveNextPath(value: string | null): string {
  if (!value || !value.startsWith('/')) return '/account';
  if (value.startsWith('//')) return '/account';
  return value;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = resolveNextPath(url.searchParams.get('next'));
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=oauth_callback_failed', origin));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[auth/callback] OAuth exchange failed', error);
      return NextResponse.redirect(new URL('/login?error=oauth_callback_failed', origin));
    }

    return NextResponse.redirect(new URL(next, origin));
  } catch (error) {
    console.error('[auth/callback] Unexpected OAuth callback failure', error);
    return NextResponse.redirect(new URL('/login?error=oauth_callback_failed', origin));
  }
}
