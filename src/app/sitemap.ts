import { MetadataRoute } from 'next';
import { publicSupabase } from '@/lib/supabase/public';
import { categoryPageConfigs } from '@/lib/category-pages';
import { siteConfig } from '@/lib/seo';

const staticRoutes = [
  '/',
  '/shop',
  '/about',
  '/help',
  '/contact',
  '/shipping',
  '/return-refund-policy',
  '/cancellation-policy',
  '/faq',
  '/privacy',
  '/terms',
  ...categoryPageConfigs.map((config) => `/category/${config.slug}`),
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const routes: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: now,
    changeFrequency: path === '/' || path === '/shop' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : path.startsWith('/category/') || path === '/shop' ? 0.9 : 0.7,
  }));

  try {
    const { data: products } = await publicSupabase
      .from('products')
      .select('slug, updated_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (products) {
      products.forEach((product) => {
        routes.push({
          url: `${siteConfig.url}/product/${product.slug}`,
          lastModified: new Date(product.updated_at),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      });
    }
  } catch (error) {
    console.error('[sitemap] Failed to fetch products:', error);
  }

  return routes;
}
