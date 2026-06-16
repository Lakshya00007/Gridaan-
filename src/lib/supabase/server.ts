import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createRawClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { serverEnv } from '@/lib/env.server';

type SupabaseCookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

/**
 * Server-side Supabase client bound to the current request.
 *
 * - In Server Components, Route Handlers, and Server Actions this returns
 *   a client that can read user session via cookies().
 * - The cookie writes here are no-op on read-only consumers (Next 15).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: SupabaseCookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component (read-only) - safe to ignore.
          }
        },
      },
    }
  );
}

/**
 * Service-role client. Bypasses RLS.
 * Use ONLY in trusted server-side code.
 */
export function createServiceClient() {
  return createRawClient(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
