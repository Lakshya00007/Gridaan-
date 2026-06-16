import CategoriesAdmin from './_client';
import { createClient } from '@/lib/supabase/server';
import type { Category } from '@/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Categories · Admin' };

export default async function Page() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from('categories').select('*').order('sort_order');
  return <CategoriesAdmin categories={(categories ?? []) as Category[]} />;
}
