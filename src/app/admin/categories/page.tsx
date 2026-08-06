import CategoriesAdmin from './_client';
import { createClient } from '@/lib/supabase/server';
import { requireAdminPermission } from '@/lib/admin/permissions';
import type { Category } from '@/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Categories · Admin' };

export default async function Page() {
  await requireAdminPermission('categories.read');
  const supabase = await createClient();
  const { data: categories } = await supabase.from('categories').select('*').order('sort_order');
  return <CategoriesAdmin categories={(categories ?? []) as Category[]} />;
}
