'use client';

import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env.public';

let _client: ReturnType<typeof createBrowserClient> | null = null;

/** Browser Supabase client. Singleton within a tab. */
export function createClient() {
  if (!_client) {
    _client = createBrowserClient(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return _client;
}
