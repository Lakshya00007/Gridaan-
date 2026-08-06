import CategoriesAdmin from './_client';
import { createClient } from '@/lib/supabase/server';
import { requireAdminPagePermission } from '@/lib/admin/permissions';
import type { Category } from '@/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Categories · Admin' };

export default async function Page() {
  await requireAdminPagePermission('categories.read');
  const supabase = await createClient();
  const { data: categories, error } = await supabase.from('categories').select('*').order('sort_order');
  if (error) throw new Error('Category data could not be loaded');
  return <CategoriesAdmin categories={(categories ?? []) as Category[]} />;
}
