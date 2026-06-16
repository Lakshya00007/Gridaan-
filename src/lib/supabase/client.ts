'use client';

import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';

let _client: ReturnType<typeof createBrowserClient> | null = null;

/** Browser Supabase client. Singleton within a tab. */
export function createClient() {
  if (!_client) {
    _client = createBrowserClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return _client;
}
