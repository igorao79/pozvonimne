import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for Electron
  output: process.env.ELECTRON_BUILD ? 'export' : undefined,

  // For Electron, we need to disable image optimization
  images: process.env.ELECTRON_BUILD ? {
    unoptimized: true,
  } : {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; sandbox;",
    domains: [
      'uasoayoovlureephzkns.supabase.co',
      'lh3.googleusercontent.com', // Google avatars
      'avatars.githubusercontent.com', // GitHub avatars
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'uasoayoovlureephzkns.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
    ],
  },

  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },


  // Experimental features for better performance
  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      '@supabase/supabase-js',
      // Убираем GSAP из optimizePackageImports для предотвращения проблем с tree-shaking
    ],
    // Enable modern features for better performance
    // Performance optimizations
    webVitalsAttribution: ['CLS', 'LCP'],
    // Enable modern features
  },

  // Moved from experimental
  serverExternalPackages: ['simple-peer'],

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: 'supabase',
            chunks: 'all',
            priority: 10,
          },
          gsap: {
            test: /[\\/]node_modules[\\/]gsap[\\/]/,
            name: 'gsap',
            chunks: 'all',
            priority: 10,
          },
        },
      };
    }
    
    return config;
  },

  // Headers for better caching and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Build optimizations
  eslint: {
    ignoreDuringBuilds: true, // Temporarily ignore for deployment
  },

  typescript: {
    ignoreBuildErrors: true, // Temporarily ignore for deployment
  },

  // PWA and performance optimizations
  poweredByHeader: false,
  compress: true,
  
  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

export default nextConfig;
