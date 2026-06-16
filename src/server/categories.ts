import { publicSupabase } from '@/lib/supabase/public';
import { unstable_cache } from 'next/cache';
import type { Category } from '@/types';

export const getActiveCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const { data, error } = await publicSupabase
      .from('categories')
      .select('id, slug, name, description, image_url, icon, is_active, sort_order, created_at, updated_at')
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
