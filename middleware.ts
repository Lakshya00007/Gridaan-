import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const APEX_HOST = 'gridaan.com';
const WWW_HOST = 'www.gridaan.com';

export function middleware(req: NextRequest) {
  if (req.nextUrl.hostname !== APEX_HOST) {
    return NextResponse.next();
  }

  const redirectUrl = req.nextUrl.clone();
  redirectUrl.protocol = 'https';
  redirectUrl.hostname = WWW_HOST;

  return NextResponse.redirect(redirectUrl, 308);
}

export const config = {
  matcher: '/:path*',
};
