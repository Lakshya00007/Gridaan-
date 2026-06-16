import { MetadataRoute } from 'next';
import { publicEnv } from '@/lib/env.public';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = publicEnv.NEXT_PUBLIC_SITE_URL;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/*',
          '/account',
          '/account/*',
          '/checkout',
          '/checkout/*',
          '/order-success',
          '/order-success/*',
          '/api',
          '/api/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
