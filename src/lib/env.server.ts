import 'server-only';

import { z } from 'zod';
import { publicEnv } from './env.public';

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  WHATSAPP_ADMIN_NUMBER: z
    .string()
    .regex(/^\d{10,15}$/, 'Use country code + number, digits only')
    .optional(),
  WHATSAPP_API_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  ADMIN_BOOTSTRAP_SECRET: z.string().min(16).optional(),
  SUPABASE_PROJECT_ID: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().trim().optional(),
  RAZORPAY_KEY_SECRET: z.string().trim().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().trim().optional(),
  PAYMENT_PROVIDER: z.enum(['mock', 'razorpay']).optional().default('mock'),
});

function formatIssues(prefix: string, issues: z.ZodIssue[]) {
  return `${prefix}: ${JSON.stringify(issues, null, 2)}`;
}

export const serverEnv = (() => {
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    WHATSAPP_ADMIN_NUMBER: process.env.WHATSAPP_ADMIN_NUMBER,
    WHATSAPP_API_TOKEN: process.env.WHATSAPP_API_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    ADMIN_BOOTSTRAP_SECRET: process.env.ADMIN_BOOTSTRAP_SECRET,
    SUPABASE_PROJECT_ID: process.env.SUPABASE_PROJECT_ID,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || undefined,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || undefined,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || undefined,
    PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'mock',
  });

  if (!parsed.success) {
    throw new Error(formatIssues('Invalid server environment variables', parsed.error.issues));
  }

  return {
    ...publicEnv,
    ...parsed.data,
  };
})();

export type ServerEnv = typeof serverEnv;
