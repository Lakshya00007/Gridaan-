import { z } from 'zod';
import { isValidMetaPixelId } from './analytics/config';

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_MANUAL_PAYMENT_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((value) => value === 'true'),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().trim().optional(),
  NEXT_PUBLIC_META_PIXEL_ID: z
    .string()
    .trim()
    .refine(isValidMetaPixelId, 'Meta Pixel ID must be numeric')
    .optional(),
  NEXT_PUBLIC_META_ALLOW_NON_PRODUCTION: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((value) => value === 'true'),
});

function formatIssues(prefix: string, issues: z.ZodIssue[]) {
  return `${prefix}: ${JSON.stringify(issues, null, 2)}`;
}

export const publicEnv = (() => {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_MANUAL_PAYMENT_ENABLED: process.env.NEXT_PUBLIC_MANUAL_PAYMENT_ENABLED,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || undefined,
    NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID || undefined,
    NEXT_PUBLIC_META_ALLOW_NON_PRODUCTION:
      process.env.NEXT_PUBLIC_META_ALLOW_NON_PRODUCTION,
  });

  if (!parsed.success) {
    throw new Error(formatIssues('Invalid public environment variables', parsed.error.issues));
  }

  return parsed.data;
})();

export type PublicEnv = typeof publicEnv;
