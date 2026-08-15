import 'server-only';

import { z } from 'zod';
import { publicEnv } from './env.public';
import { isPublishableSupportEmail, isValidIndianGstin } from './business-info';
import { parseServerFeatureFlag } from './shipping/feature-flag';
import { isValidMetaPixelId } from './analytics/config';

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
  NIMBUSPOST_ENABLED: z.boolean().default(false),
  META_CAPI_ENABLED: z.boolean().default(false),
  META_CAPI_ACCESS_TOKEN: z.string().trim().min(20).optional(),
  META_CAPI_TEST_EVENT_CODE: z.string().trim().min(3).max(120).optional(),
}).superRefine((value, ctx) => {
  if (value.NIMBUSPOST_ENABLED) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['NIMBUSPOST_ENABLED'],
      message:
        'NimbusPost official endpoint-level API documentation and authentication contract must be implemented before enabling live shipping.',
    });
  }
  if (value.META_CAPI_ENABLED) {
    if (!isValidMetaPixelId(publicEnv.NEXT_PUBLIC_META_PIXEL_ID)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['NEXT_PUBLIC_META_PIXEL_ID'],
        message: 'Meta CAPI requires a valid public Meta Pixel ID.',
      });
    }
    if (!value.META_CAPI_ACCESS_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['META_CAPI_ACCESS_TOKEN'],
        message: 'Meta CAPI requires a server-only access token.',
      });
    }
  }
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
    NIMBUSPOST_ENABLED: parseServerFeatureFlag(process.env.NIMBUSPOST_ENABLED),
    META_CAPI_ENABLED: parseServerFeatureFlag(process.env.META_CAPI_ENABLED),
    META_CAPI_ACCESS_TOKEN: process.env.META_CAPI_ACCESS_TOKEN || undefined,
    META_CAPI_TEST_EVENT_CODE: process.env.META_CAPI_TEST_EVENT_CODE || undefined,
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
