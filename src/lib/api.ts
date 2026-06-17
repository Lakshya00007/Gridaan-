import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getProfile } from '@/lib/supabase/auth';
import { publicEnv } from '@/lib/env.public';

export type RouteHandler = (
  req: Request,
  ctx: { params: Promise<Record<string, string>> }
) => Promise<Response> | Response;

/**
 * Wraps a route handler with:
 *   - Authentication check (default: require any logged-in user)
 *   - Zod validation
 *   - JSON error responses
 */
export function withAuth(
  handler: (args: {
    req: Request;
    user: { id: string; email: string | null };
    profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>;
    params: Record<string, string>;
  }) => Promise<Response> | Response,
  options: { admin?: boolean } = {}
): RouteHandler {
  return async (req, ctx) => {
    try {
      const profile = await getProfile();
      if (!profile) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
      }
      if (options.admin && !profile.is_admin) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      const params = ctx ? await ctx.params : {};
      return await handler({ req, user: { id: profile.id, email: profile.email }, profile, params });
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: 'validation_error', issues: err.flatten() },
      { status: 422 }
    );
  }
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  // Don't leak internal details
  console.error('[api]', err);
  return NextResponse.json({ error: 'internal_error' }, { status: 500 });
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function badRequest(message: string, code?: string) {
  return new ApiError(message, 400, code);
}
export function unauthorized(message = 'unauthorized') {
  return new ApiError(message, 401);
}
export function forbidden(message = 'forbidden') {
  return new ApiError(message, 403);
}
export function notFound(message = 'not found') {
  return new ApiError(message, 404);
}

export function assertJsonRequest(req: Request) {
  const contentType = req.headers.get('content-type')?.split(';')[0]?.trim();
  if (contentType !== 'application/json') {
    throw badRequest('Expected application/json request body', 'invalid_content_type');
  }
}

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

function getAllowedOrigins(): Set<string> {
  const allowed = new Set<string>();
  const configuredOrigin = normalizeOrigin(publicEnv.NEXT_PUBLIC_SITE_URL);

  if (configuredOrigin) {
    allowed.add(configuredOrigin);
  }

  allowed.add('https://gridaan.com');
  allowed.add('https://www.gridaan.com');

  return allowed;
}

function isAllowedOrigin(origin: string): boolean {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;

  if (getAllowedOrigins().has(normalized)) {
    return true;
  }

  return isLocalDevOrigin(normalized);
}

export function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  if (origin && !isAllowedOrigin(origin)) {
    throw forbidden('Origin not allowed');
  }

  if (!origin && referer) {
    if (!isAllowedOrigin(referer)) {
      throw forbidden('Referer not allowed');
    }
  }
}
