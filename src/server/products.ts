import { publicSupabase } from '@/lib/supabase/public';
import { unstable_cache } from 'next/cache';
import type { Product, ProductFilter } from '@/types';
import { calculateApprovedReviewSummaries } from '@/lib/reviews';

const PRODUCT_COLS =
  'id, slug, name, description, short_description, sku, price, original_price, discount, images, image_metadata, category_id, subcategory, product_type, gender, material, colour, size, weight_grams, jewellery_type, tags, in_stock, stock_count, reserved_stock, return_eligible, rating, review_count, is_trending, is_new_arrival, is_best_seller, metadata, created_at, updated_at, category:categories(*)';

export async function withApprovedReviewStats(products: Product[]): Promise<Product[]> {
  if (products.length === 0) return products;

  const productIds = products.map((product) => product.id);
  const { data, error } = await publicSupabase
    .from('product_reviews')
    .select('product_id, rating')
    .eq('status', 'approved')
    .in('product_id', productIds);

  if (error) {
    console.error('[products] approved review lookup failed', { code: error.code });
  }

  const summaries = calculateApprovedReviewSummaries(
    productIds,
    error ? [] : ((data ?? []) as Array<{ product_id: string; rating: number }>),
  );

  return products.map((product) => ({
    ...product,
    ...(summaries.get(product.id) ?? { rating: 0, review_count: 0 }),
  }));
}

function normalizeSearchTerm(value: string) {
  return value.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim().replace(/\s+/g, ' ');
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await publicSupabase
    .from('products')
    .select(PRODUCT_COLS)
    .eq('slug', slug)
    .eq('is_active', true)
    .is('archived_at', null)
    .maybeSingle();

  if (error) {
    console.error('[products] get by slug failed', { code: error.code });
    return null;
  }

  if (!data) return null;
  const [product] = await withApprovedReviewStats([data as unknown as Product]);
  return product ?? null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await publicSupabase
    .from('products')
    .select(PRODUCT_COLS)
    .eq('id', id)
    .eq('is_active', true)
    .is('archived_at', null)
    .maybeSingle();

  if (error) {
    console.error('[products] get by id failed', { code: error.code });
    return null;
  }

  if (!data) return null;
  const [product] = await withApprovedReviewStats([data as unknown as Product]);
  return product ?? null;
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
      .eq('is_active', true)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[products] featured failed', { flag, code: error.code });
      return [];
    }

    return withApprovedReviewStats((data ?? []) as unknown as Product[]);
  },
  ['featured-products'],
  { revalidate: 300, tags: ['products'] }
);

export async function listProducts(
  filter: ProductFilter
): Promise<{ products: Product[]; count: number }> {
  let q = publicSupabase
    .from('products')
    .select(PRODUCT_COLS, { count: 'exact' })
    .eq('is_active', true)
    .is('archived_at', null);

  if (filter.category && filter.category !== 'all') {
    const { data: category, error: categoryError } = await publicSupabase
      .from('categories')
      .select('id')
      .eq('slug', filter.category)
      .maybeSingle();

    if (categoryError) {
      console.error('[products] category lookup failed', { code: categoryError.code });
      return { products: [], count: 0 };
    }

    if (!category?.id) {
      return { products: [], count: 0 };
    }

    q = q.eq('category_id', category.id);
  }
  if (filter.search) {
    const normalized = normalizeSearchTerm(filter.search);
    if (normalized) {
      q = q.textSearch('fts', normalized, { type: 'websearch' });
    }
  }
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
    console.error('[products] list failed', { code: error.code });
    return { products: [], count: 0 };
  }

  return {
    products: await withApprovedReviewStats((data ?? []) as unknown as Product[]),
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
    .eq('is_active', true)
    .is('archived_at', null)
    .limit(limit);

  if (error) {
    console.error('[products] related failed', { code: error.code });
    return [];
  }

  return withApprovedReviewStats((data ?? []) as unknown as Product[]);
}
