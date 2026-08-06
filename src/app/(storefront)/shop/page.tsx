import ShopView from './_view';
import { buildPageMetadata } from '@/lib/seo';
import { getActiveCategories } from '@/server/categories';
import { listProducts } from '@/server/products';
import type { ProductSort } from '@/types';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  title: 'Shop Artificial & Fashion Jewellery Online | Gridaan',
  description:
    "Shop affordable artificial and imitation fashion jewellery online at Gridaan. Explore women's earrings, necklaces, bangles, full jewellery sets, and men's chains, bracelets, rings, and pendants.",
  path: '/shop',
});

const productSorts = new Set<ProductSort>([
  'featured',
  'newest',
  'trending',
  'price_asc',
  'price_desc',
  'rating',
]);

type ShopSearchParams = Record<string, string | string[] | undefined>;

function getFirstParam(params: ShopSearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function getOptionalNumber(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildQueryString(params: ShopSearchParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) query.set(key, first);
  }
  return query.toString();
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const params = await searchParams;
  const sortParam = getFirstParam(params, 'sort');
  const sort = sortParam && productSorts.has(sortParam as ProductSort) ? (sortParam as ProductSort) : 'featured';
  const [{ products, count }, categories] = await Promise.all([
    listProducts({
      category: getFirstParam(params, 'category') ?? 'all',
      search: getFirstParam(params, 'q'),
      sort,
      minPrice: getOptionalNumber(getFirstParam(params, 'min')),
      maxPrice: getOptionalNumber(getFirstParam(params, 'max')),
      inStock: getFirstParam(params, 'in_stock') === 'true',
      limit: 24,
      offset: 0,
    }),
    getActiveCategories(),
  ]);

  return (
    <ShopView
      initialProducts={products}
      initialCount={count}
      initialCategories={categories}
      initialQueryString={buildQueryString(params)}
    />
  );
}
