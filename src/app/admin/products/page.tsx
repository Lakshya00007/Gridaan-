import ProductsAdmin from './_client';
import { createClient } from '@/lib/supabase/server';
import type { Category, Product } from '@/types';

type AdminProduct = Product & { category: Pick<Category, 'id' | 'name' | 'slug'> | null };

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Products · Admin' };

export default async function Page() {
  const supabase = await createClient();
  const [{ data: products, count }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select('*, category:categories(id, name, slug)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, 199),
    supabase.from('categories').select('*').order('sort_order'),
  ]);
  return (
    <ProductsAdmin
      products={(products ?? []) as AdminProduct[]}
      count={count ?? 0}
      categories={(categories ?? []) as Category[]}
    />
  );
}
