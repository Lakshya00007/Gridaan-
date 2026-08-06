/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 640, 750, 828, 1080, 1200, 1920],
  },

  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },

  async redirects() {
    return [
      {
        source: '/privacy-policy',
        destination: '/privacy',
        permanent: true,
      },
      {
        source: '/terms-and-conditions',
        destination: '/terms',
        permanent: true,
      },
      {
        source: '/return-policy',
        destination: '/return-refund-policy',
        permanent: true,
      },
      {
        source: '/refund-policy',
        destination: '/return-refund-policy',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'gridaan.com',
          },
        ],
        destination: 'https://www.gridaan.com/:path*',
        permanent: true,
      },
    ];
  },

  async headers() {
    const contentSecurityPolicy = `
      default-src 'self';

      script-src
        'self'
        'unsafe-inline'
        https://checkout.razorpay.com
        https://cdn.razorpay.com
        ${isDev ? "'unsafe-eval'" : ''};

      script-src-elem
        'self'
        'unsafe-inline'
        https://checkout.razorpay.com
        https://cdn.razorpay.com
        ${isDev ? "'unsafe-eval'" : ''};

      style-src
        'self'
        'unsafe-inline';

      img-src
        'self'
        data:
        blob:
        https://*.supabase.co
        https://images.pexels.com
        https://res.cloudinary.com
        https://lh3.googleusercontent.com
        https://*.razorpay.com;

      font-src
        'self'
        data:
        https://fonts.gstatic.com;

      connect-src
        'self'
        https://*.supabase.co
        wss://*.supabase.co
        https://api.razorpay.com
        https://*.razorpay.com;

      frame-src
        'self'
        https://api.razorpay.com
        https://checkout.razorpay.com
        https://*.razorpay.com;

      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
    `
      .replace(/\s{2,}/g, ' ')
      .trim();

    return [
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
