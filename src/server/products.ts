import { publicSupabase } from '@/lib/supabase/public';
import { unstable_cache } from 'next/cache';
import type { Product, ProductFilter } from '@/types';

const PRODUCT_COLS =
  'id, slug, name, description, price, original_price, discount, images, category_id, tags, in_stock, stock_count, rating, review_count, is_trending, is_new_arrival, is_best_seller, metadata, created_at, updated_at, category:categories(*)';

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await publicSupabase
    .from('products')
    .select(PRODUCT_COLS)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('[products] get by slug failed', error);
    return null;
  }

  return (data as unknown as Product) ?? null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await publicSupabase
    .from('products')
    .select(PRODUCT_COLS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[products] get by id failed', error);
    return null;
  }

  return (data as unknown as Product) ?? null;
}

export const getFeaturedProducts = unstable_cache(
  async (
    flag: 'is_trending' | 'is_new_arrival' | 'is_best_seller',
    limit = 4
  ): Promise<Product[]> => {
    const { data, error } = await publicSupabase
      .from('products')
      .select(PRODUCT_COLS)
      .eq(flag, true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[products] featured failed', flag, error);
      return [];
    }

    return (data ?? []) as unknown as Product[];
  },
  ['featured-products'],
  { revalidate: 300, tags: ['products'] }
);

export async function listProducts(
  filter: ProductFilter
): Promise<{ products: Product[]; count: number }> {
  let q = publicSupabase
    .from('products')
    .select(PRODUCT_COLS, { count: 'exact' });

  if (filter.category) q = q.eq('category.slug', filter.category);
  if (filter.search) q = q.textSearch('fts', filter.search, { type: 'websearch' });
  if (filter.minPrice != null) q = q.gte('price', filter.minPrice);
  if (filter.maxPrice != null) q = q.lte('price', filter.maxPrice);
  if (filter.inStock) q = q.eq('in_stock', true);
  if (filter.tags?.length) q = q.overlaps('tags', filter.tags);

  switch (filter.sort) {
    case 'price_asc':
      q = q.order('price', { ascending: true });
      break;
    case 'price_desc':
      q = q.order('price', { ascending: false });
      break;
    case 'newest':
      q = q.order('created_at', { ascending: false });
      break;
    case 'rating':
      q = q.order('rating', { ascending: false });
      break;
    case 'trending':
      q = q.order('is_trending', { ascending: false });
      break;
    default:
      q = q.order('created_at', { ascending: false });
  }

  q = q.range(
    filter.offset ?? 0,
    (filter.offset ?? 0) + (filter.limit ?? 12) - 1
  );

  const { data, count, error } = await q;

  if (error) {
    console.error('[products] list failed', error);
    return { products: [], count: 0 };
  }

  return {
    products: (data ?? []) as unknown as Product[],
    count: count ?? 0,
  };
}

export async function getRelatedProducts(
  product: Product,
  limit = 4
): Promise<Product[]> {
  const { data, error } = await publicSupabase
    .from('products')
    .select(PRODUCT_COLS)
    .eq('category_id', product.category_id ?? '')
    .neq('id', product.id)
    .limit(limit);

  if (error) {
    console.error('[products] related failed', error);
    return [];
  }

  return (data ?? []) as unknown as Product[];
}