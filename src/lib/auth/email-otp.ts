import { z } from 'zod';

export const emailOtpRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

export const emailOtpVerifySchema = emailOtpRequestSchema.extend({
  token: z.string().trim().regex(/^\d{6}$/, 'Enter the six-digit code from your email.'),
});

export function hasVerifiedEmail(user: {
  email?: string | null;
  email_confirmed_at?: string | null;
  is_anonymous?: boolean;
} | null | undefined) {
  return Boolean(user?.email && user.email_confirmed_at && !user.is_anonymous);
}
