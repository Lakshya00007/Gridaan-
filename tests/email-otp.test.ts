import { describe, expect, it } from 'vitest';
import { emailOtpRequestSchema, emailOtpVerifySchema, hasVerifiedEmail } from '@/lib/auth/email-otp';
import { getSafeAuthRedirect } from '@/lib/auth-navigation';

describe('verified email checkout gate', () => {
  it('accepts only a confirmed email identity', () => {
    expect(hasVerifiedEmail({ email: 'buyer@example.com', email_confirmed_at: '2026-09-26T00:00:00Z' })).toBe(true);
    expect(hasVerifiedEmail({ email: 'buyer@example.com', email_confirmed_at: null })).toBe(false);
    expect(hasVerifiedEmail({ email: 'buyer@example.com', email_confirmed_at: '2026-09-26T00:00:00Z', is_anonymous: true })).toBe(false);
  });

  it('normalizes email and requires a six-digit numeric code', () => {
    expect(emailOtpRequestSchema.parse({ email: '  BUYER@EXAMPLE.COM  ' }).email).toBe('buyer@example.com');
    expect(emailOtpVerifySchema.safeParse({ email: 'buyer@example.com', token: '123456' }).success).toBe(true);
    expect(emailOtpVerifySchema.safeParse({ email: 'buyer@example.com', token: '12345x' }).success).toBe(false);
  });

  it('keeps checkout redirects on this site', () => {
    expect(getSafeAuthRedirect('/checkout')).toBe('/checkout');
    expect(getSafeAuthRedirect('//evil.example/checkout')).toBe('/');
  });
});
