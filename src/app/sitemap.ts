import { MetadataRoute } from 'next';
import { publicSupabase } from '@/lib/supabase/public';
import { publicEnv } from '@/lib/env.public';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = publicEnv.NEXT_PUBLIC_SITE_URL;

  // Static routes
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // Fetch active categories
  try {
    const { data: categories } = await publicSupabase
      .from('categories')
      .select('slug, updated_at')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (categories) {
      categories.forEach((cat) => {
        routes.push({
          url: `${baseUrl}/shop?category=${cat.slug}`,
          lastModified: new Date(cat.updated_at),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      });
    }
  } catch (error) {
    console.error('[sitemap] Failed to fetch categories:', error);
  }

  // Fetch products
  try {
    const { data: products } = await publicSupabase
      .from('products')
      .select('slug, updated_at')
      .eq('in_stock', true)
      .order('created_at', { ascending: false })
      .limit(500); // Limit to prevent huge sitemaps

    if (products) {
      products.forEach((product) => {
        routes.push({
          url: `${baseUrl}/product/${product.slug}`,
          lastModified: new Date(product.updated_at),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      });
    }
  } catch (error) {
    console.error('[sitemap] Failed to fetch products:', error);
  }

  return routes;
}
