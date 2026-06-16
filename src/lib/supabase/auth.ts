import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createClient } from './server';
import type { Profile } from '@/types';

/**
 * Resolve the currently authenticated user. Cached per request.
 * Returns null when no user is signed in.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Returns the current user or redirects to /login. */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}

/** Resolve the profile row for the current user, or null. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (error) return null;
  return data as Profile | null;
});

/** Require an admin user; redirect to home if not admin. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect('/login?next=/admin');
  if (!profile.is_admin) redirect('/?error=forbidden');
  return profile;
}
