import { requireAdminRole } from '@/lib/admin/permissions';
import AdminShell from './_shell';
import { buildNoIndexMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata = buildNoIndexMetadata('Admin');

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminRole();
  const profile = admin.profile;

  return (
    <AdminShell
      user={{
        id: profile.id,
        email: profile.email ?? '',
        full_name: profile.full_name ?? 'Admin',
        role: admin.role,
        permissions: admin.permissions,
        legacyIsAdmin: profile.is_admin,
      }}
    >
      {children}
    </AdminShell>
  );
}
