import { publicSupabase } from '@/lib/supabase/public';
import { unstable_cache } from 'next/cache';
import type { Category } from '@/types';

export const getActiveCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const { data, error } = await publicSupabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[categories] failed to load', error);
      return [];
    }

    return (data ?? []) as Category[];
  },
  ['active-categories'],
  { revalidate: 300, tags: ['categories'] }
);