import 'server-only';

import { z } from 'zod';
import { publicEnv } from './env.public';
import { isPublishableSupportEmail, isValidIndianGstin } from './business-info';

const publishableEmail = z
  .string()
  .trim()
  .email()
  .refine(isPublishableSupportEmail, 'Placeholder email addresses cannot be published')
  .optional();

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  WHATSAPP_API_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  SUPABASE_PROJECT_ID: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().trim().optional(),
  RAZORPAY_KEY_SECRET: z.string().trim().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().trim().optional(),
  PAYMENT_PROVIDER: z.enum(['mock', 'razorpay']).optional().default('mock'),
  SUPPORT_EMAIL: publishableEmail,
  GSTIN: z.string().trim().refine(isValidIndianGstin, 'GSTIN format is invalid').optional(),
  GRIEVANCE_OFFICER_NAME: z.string().trim().min(2).optional(),
  GRIEVANCE_EMAIL: publishableEmail,
  GRIEVANCE_CONTACT_METHOD: z.string().trim().min(3).optional(),
  GRIEVANCE_RESPONSE_EXPECTATION: z.string().trim().min(3).optional(),
  SHIPPING_DISPATCH_ESTIMATE: z.string().trim().min(3).optional(),
  SHIPPING_DELIVERY_ESTIMATE: z.string().trim().min(3).optional(),
  SHIPPING_REMOTE_AREA_ESTIMATE: z.string().trim().min(3).optional(),
  REFUND_INITIATION_ESTIMATE: z.string().trim().min(3).optional(),
});

function formatIssues(prefix: string, issues: z.ZodIssue[]) {
  return `${prefix}: ${JSON.stringify(issues, null, 2)}`;
}

export const serverEnv = (() => {
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    WHATSAPP_API_TOKEN: process.env.WHATSAPP_API_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    SUPABASE_PROJECT_ID: process.env.SUPABASE_PROJECT_ID,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || undefined,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || undefined,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || undefined,
    PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'mock',
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || undefined,
    GSTIN: process.env.GSTIN || undefined,
    GRIEVANCE_OFFICER_NAME: process.env.GRIEVANCE_OFFICER_NAME || undefined,
    GRIEVANCE_EMAIL: process.env.GRIEVANCE_EMAIL || undefined,
    GRIEVANCE_CONTACT_METHOD: process.env.GRIEVANCE_CONTACT_METHOD || undefined,
    GRIEVANCE_RESPONSE_EXPECTATION: process.env.GRIEVANCE_RESPONSE_EXPECTATION || undefined,
    SHIPPING_DISPATCH_ESTIMATE: process.env.SHIPPING_DISPATCH_ESTIMATE || undefined,
    SHIPPING_DELIVERY_ESTIMATE: process.env.SHIPPING_DELIVERY_ESTIMATE || undefined,
    SHIPPING_REMOTE_AREA_ESTIMATE: process.env.SHIPPING_REMOTE_AREA_ESTIMATE || undefined,
    REFUND_INITIATION_ESTIMATE: process.env.REFUND_INITIATION_ESTIMATE || undefined,
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
