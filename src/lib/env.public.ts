import { z } from 'zod';

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_MANUAL_PAYMENT_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((value) => value === 'true'),
  NEXT_PUBLIC_UPI_ID: z.string().trim().min(3).optional(),
  NEXT_PUBLIC_UPI_NAME: z.string().trim().min(2).optional(),
  NEXT_PUBLIC_BANK_ACCOUNT_NAME: z.string().trim().min(2).optional(),
  NEXT_PUBLIC_BANK_ACCOUNT_NUMBER: z.string().trim().min(4).optional(),
  NEXT_PUBLIC_BANK_IFSC: z.string().trim().min(4).optional(),
  NEXT_PUBLIC_BANK_NAME: z.string().trim().min(2).optional(),
  NEXT_PUBLIC_BANK_BRANCH: z.string().trim().min(2).optional(),
  NEXT_PUBLIC_PAYMENT_SUPPORT_PHONE: z.string().trim().min(8).optional(),
  NEXT_PUBLIC_PAYMENT_SUPPORT_EMAIL: z.string().email().optional(),
  NEXT_PUBLIC_SUPPORT_PHONE: z.string().trim().min(8).optional(),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email().optional(),
  NEXT_PUBLIC_BUSINESS_NAME: z.string().trim().min(2).optional(),
  NEXT_PUBLIC_BUSINESS_ADDRESS: z.string().trim().min(5).optional(),
  NEXT_PUBLIC_RETURN_ADDRESS: z.string().trim().min(5).optional(),
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
    NEXT_PUBLIC_UPI_ID: process.env.NEXT_PUBLIC_UPI_ID || undefined,
    NEXT_PUBLIC_UPI_NAME: process.env.NEXT_PUBLIC_UPI_NAME || undefined,
    NEXT_PUBLIC_BANK_ACCOUNT_NAME: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || undefined,
    NEXT_PUBLIC_BANK_ACCOUNT_NUMBER: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || undefined,
    NEXT_PUBLIC_BANK_IFSC: process.env.NEXT_PUBLIC_BANK_IFSC || undefined,
    NEXT_PUBLIC_BANK_NAME: process.env.NEXT_PUBLIC_BANK_NAME || undefined,
    NEXT_PUBLIC_BANK_BRANCH: process.env.NEXT_PUBLIC_BANK_BRANCH || undefined,
    NEXT_PUBLIC_PAYMENT_SUPPORT_PHONE: process.env.NEXT_PUBLIC_PAYMENT_SUPPORT_PHONE || undefined,
    NEXT_PUBLIC_PAYMENT_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_PAYMENT_SUPPORT_EMAIL || undefined,
    NEXT_PUBLIC_SUPPORT_PHONE: process.env.NEXT_PUBLIC_SUPPORT_PHONE || undefined,
    NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || undefined,
    NEXT_PUBLIC_BUSINESS_NAME: process.env.NEXT_PUBLIC_BUSINESS_NAME || undefined,
    NEXT_PUBLIC_BUSINESS_ADDRESS: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || undefined,
    NEXT_PUBLIC_RETURN_ADDRESS: process.env.NEXT_PUBLIC_RETURN_ADDRESS || undefined,
  });

  if (!parsed.success) {
    throw new Error(formatIssues('Invalid public environment variables', parsed.error.issues));
  }

  return parsed.data;
})();

export type PublicEnv = typeof publicEnv;
