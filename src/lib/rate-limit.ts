/**
 * Simple in-memory rate limiter for API routes.
 * For production with multiple instances, use Redis, Upstash, or similar.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const globalStore = globalThis as typeof globalThis & {
  __gridaanRateLimitStore__?: Map<string, RateLimitEntry>;
};

const store = globalStore.__gridaanRateLimitStore__ ?? new Map<string, RateLimitEntry>();
globalStore.__gridaanRateLimitStore__ = store;

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSec: number;
}

/**
 * Check if a request is rate-limited.
 * @param identifier - Unique identifier (e.g. IP address, user ID)
 * @param config - Rate limit configuration
 * @returns true if rate limit exceeded, false if allowed
 */
export function isRateLimited(
  identifier: string,
  config: RateLimitConfig = { limit: 10, windowSec: 60 }
): boolean {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }

  const key = `ratelimit:${identifier}`;
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // First request in window or window expired
    store.set(key, {
      count: 1,
      resetAt: now + config.windowSec * 1000,
    });
    return false;
  }

  if (entry.count >= config.limit) {
    // Rate limit exceeded
    return true;
  }

  // Increment count
  entry.count += 1;
  store.set(key, entry);
  return false;
}

/**
 * Get client identifier from request (IP address or user-agent as fallback)
 */
export function getClientIdentifier(req: Request): string {
  // Try to get real IP from common headers
  const headers = req.headers;
  const forwarded = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const cfIp = headers.get('cf-connecting-ip');

  const ip = cfIp || realIp || (forwarded ? forwarded.split(',')[0].trim() : null);

  if (ip) return ip;

  // Fallback to user-agent (less reliable but better than nothing)
  return headers.get('user-agent') || 'unknown';
}
