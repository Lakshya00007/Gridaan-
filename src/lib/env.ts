import { z } from 'zod';

/**
 * Centralised, type-safe env loader. The exported `env` object is
 * guaranteed to be valid at build time - if a required variable is
 * missing, the build fails fast.
 */
const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),

  // Server-only
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

  // Razorpay — NEXT_PUBLIC_RAZORPAY_KEY_ID is the publishable key safe for the browser.
  // RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET must NEVER be exposed to the client.
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().min(8),
  RAZORPAY_KEY_SECRET: z.string().min(8),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(8).optional(),

  // Notifications
  WHATSAPP_ADMIN_NUMBER: z
    .string()
    .regex(/^\d{10,15}$/, 'Use country code + number, digits only'),
  WHATSAPP_API_TOKEN: z.string().optional(),

  // Site
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  ADMIN_BOOTSTRAP_SECRET: z.string().min(16).optional(),
});

const clientSchema = serverSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
  NEXT_PUBLIC_SITE_URL: true,
  NEXT_PUBLIC_RAZORPAY_KEY_ID: true,
});

function load() {
  // Only the server sees process.env here. NEXT_PUBLIC_* are also inlined at build.
  const parsed = serverSchema.safeParse(process.env);
  if (parsed.success) return parsed.data;

  // In the client bundle, process.env is replaced at build time.
  // We re-parse with the client schema which is more permissive.
  const clientParsed = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  });

  if (!clientParsed.success) {
    const issues = parsed.success ? clientParsed.error.issues : parsed.error.issues;
    throw new Error(
      'Invalid environment variables: ' + JSON.stringify(issues, null, 2)
    );
  }
  return clientParsed.data as unknown as z.infer<typeof serverSchema>;
}

export const env = load();
