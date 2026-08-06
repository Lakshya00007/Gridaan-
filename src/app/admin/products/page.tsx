import ProductsAdmin from './_client';
import { createClient } from '@/lib/supabase/server';
import { requireAdminPagePermission } from '@/lib/admin/permissions';
import type { Category, Product } from '@/types';

type AdminProduct = Product & { category: Pick<Category, 'id' | 'name' | 'slug'> | null };

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Products · Admin' };
const PAGE_SIZE = 50;

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdminPagePermission('products.read');
  const supabase = await createClient();
  const page = Math.max(1, Number.parseInt((await searchParams).page ?? '1', 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const [{ data: products, count, error: productsError }, { data: categories, error: categoriesError }] = await Promise.all([
    supabase
      .from('products')
      .select('*, category:categories(id, name, slug)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to),
    supabase.from('categories').select('*').order('sort_order'),
  ]);
  if (productsError || categoriesError) throw new Error('Product data could not be loaded');
  return (
    <ProductsAdmin
      products={(products ?? []) as AdminProduct[]}
      count={count ?? 0}
      categories={(categories ?? []) as Category[]}
      page={page}
      pageSize={PAGE_SIZE}
      hasMore={to + 1 < (count ?? 0)}
    />
  );
}
