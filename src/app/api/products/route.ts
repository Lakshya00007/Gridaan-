import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const querySchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  sort: z
    .enum(['featured', 'newest', 'trending', 'price_asc', 'price_desc', 'rating'])
    .optional(),
  max: z.coerce.number().min(0).max(1_000_000).optional(),
  min: z.coerce.number().min(0).max(1_000_000).optional(),
  in_stock: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  limit: z.coerce.number().min(1).max(60).default(24),
  offset: z.coerce.number().min(0).default(0),
});

function normalizeSearchTerm(value: string) {
  return value.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim().replace(/\s+/g, ' ');
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parsed = querySchema.safeParse(Object.fromEntries(sp));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_query', issues: parsed.error.flatten() }, { status: 400 });
  }
  const f = parsed.data;
  const supabase = await createClient();

  // First, resolve category slug -> id for filtering.
  let categoryId: string | null = null;
  if (f.category && f.category !== 'all') {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', f.category)
      .maybeSingle();
    categoryId = cat?.id ?? null;
  }

  let q = supabase.from('products').select(
    'id, slug, name, description, price, original_price, discount, images, category_id, tags, in_stock, stock_count, rating, review_count, is_trending, is_new_arrival, is_best_seller, metadata, created_at, updated_at, category:categories!products_category_id_fkey(id, slug, name, icon, image_url)',
    { count: 'exact' }
  );
  if (categoryId) q = q.eq('category_id', categoryId);
  if (f.q) {
    const normalized = normalizeSearchTerm(f.q);
    if (normalized) {
      q = q.textSearch('fts', normalized, { type: 'websearch' });
    }
  }
  if (f.min != null) q = q.gte('price', f.min);
  if (f.max != null) q = q.lte('price', f.max);
  if (f.in_stock) q = q.eq('in_stock', true);

  switch (f.sort) {
    case 'price_asc': q = q.order('price', { ascending: true }); break;
    case 'price_desc': q = q.order('price', { ascending: false }); break;
    case 'newest': q = q.order('created_at', { ascending: false }); break;
    case 'rating': q = q.order('rating', { ascending: false }); break;
    case 'trending': q = q.order('is_trending', { ascending: false }).order('rating', { ascending: false }); break;
    default: q = q.order('is_trending', { ascending: false }).order('created_at', { ascending: false });
  }
  q = q.range(f.offset, f.offset + f.limit - 1);

  const [{ data, count, error }, { data: cats }] = await Promise.all([
    q,
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
  ]);

  if (error) {
    return NextResponse.json({ error: 'fetch_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({
    products: data ?? [],
    count: count ?? 0,
    categories: cats ?? [],
  });
}
