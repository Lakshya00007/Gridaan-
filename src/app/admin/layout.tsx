import { requireAdmin } from '@/lib/supabase/auth';
import AdminShell from './_shell';
import { buildNoIndexMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata = buildNoIndexMetadata('Admin');

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();

  return (
    <AdminShell
      user={{
        id: profile.id,
        email: profile.email ?? '',
        full_name: profile.full_name ?? 'Admin',
      }}
    >
      {children}
    </AdminShell>
  );
}
