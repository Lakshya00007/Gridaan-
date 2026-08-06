import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { forbidden, unauthorized } from '@/lib/api';
import { getProfile } from '@/lib/supabase/auth';
import type { AdminProfile, AdminRole, Profile } from '@/types';
import { hasPermission, type AdminPermission } from './permissions-core';

export type ResolvedAdmin = {
  profile: Profile;
  adminProfile: AdminProfile | null;
  role: AdminRole;
  permissions: string[];
};

export const getAdminContext = cache(async (): Promise<ResolvedAdmin | null> => {
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('admin_profiles')
    .select('*')
    .eq('user_id', profile.id)
    .eq('is_active', true)
    .maybeSingle();

  const adminProfile = (data as AdminProfile | null) ?? null;
  if (!profile.is_admin && !adminProfile) return null;

  return {
    profile,
    adminProfile,
    role: adminProfile?.role ?? 'admin',
    permissions: adminProfile?.permissions ?? [],
  };
});

export async function requireAdminRole(): Promise<ResolvedAdmin> {
  const context = await getAdminContext();
  if (!context) redirect('/login?next=/admin');
  return context;
}

export async function requireAdminPermission(permission: AdminPermission): Promise<ResolvedAdmin> {
  const context = await getAdminContext();
  if (!context) throw unauthorized();
  if (
    !hasPermission({
      role: context.role,
      explicitPermissions: context.permissions,
      permission,
      legacyIsAdmin: context.profile.is_admin,
    })
  ) {
    throw forbidden();
  }
  return context;
}
