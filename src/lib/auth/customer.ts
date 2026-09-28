import 'server-only';

import { ApiError } from '@/lib/api';
import { getUser } from '@/lib/supabase/auth';
import { hasVerifiedEmail } from './email-otp';

/** Identity is checked against Supabase Auth, never against browser metadata. */
export async function getVerifiedCustomer() {
  const user = await getUser();
  return user && hasVerifiedEmail(user) ? { ...user, email: user.email! } : null;
}

export async function requireVerifiedCustomer() {
  const user = await getVerifiedCustomer();
  if (!user) {
    throw new ApiError('Sign in with your email to continue.', 401, 'email_login_required');
  }
  return user;
}
