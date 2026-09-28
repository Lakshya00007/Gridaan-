import 'server-only';

import { serverEnv } from '@/lib/env.server';
import { ShippingError } from '../../errors';

let cachedToken: string | null = null;
let cachedUntil = 0;

export function getNimbusPostCredentials() {
  if (!serverEnv.NIMBUSPOST_ENABLED) {
    throw new ShippingError({ code: 'shipping_disabled', message: 'NimbusPost is disabled.', status: 409 });
  }
  if (!serverEnv.NIMBUSPOST_EMAIL || !serverEnv.NIMBUSPOST_PASSWORD) {
    throw new ShippingError({ code: 'shipping_not_configured', message: 'NimbusPost login is not configured.', status: 503 });
  }
  return { email: serverEnv.NIMBUSPOST_EMAIL, password: serverEnv.NIMBUSPOST_PASSWORD };
}

export async function getNimbusPostToken(fetcher: typeof fetch = fetch): Promise<string> {
  const credentials = getNimbusPostCredentials();
  if (cachedToken && Date.now() < cachedUntil) return cachedToken;

  let response: Response;
  try {
    response = await fetcher('https://api.nimbuspost.com/v1/users/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(credentials),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ShippingError({ code: 'provider_unavailable', message: 'NimbusPost login is unavailable.', status: 503 });
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== 'object' || !('status' in body) || body.status !== true || !('data' in body) || typeof body.data !== 'string' || !body.data) {
    throw new ShippingError({ code: 'provider_auth_failed', message: 'NimbusPost authentication failed.', status: 503 });
  }
  cachedToken = body.data;
  // The published login response does not specify a token lifetime. Refresh conservatively.
  cachedUntil = Date.now() + 10 * 60_000;
  return cachedToken;
}

export function clearNimbusPostToken() {
  cachedToken = null;
  cachedUntil = 0;
}
