import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GitHub Pages deployment configuration
  output: 'export',
  trailingSlash: true,
  basePath: process.env.NODE_ENV === 'production' ? '/pozvonimne' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/pozvonimne' : '',

  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error']
    } : false,
  },

  // Image optimization
  images: {
    unoptimized: true, // Required for static export
  },

  // Experimental features for better performance (disabled tracing for OneDrive compatibility)
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // Disable tracing to avoid OneDrive permission issues
    disableOptimizedLoading: true,
    serverComponentsExternalPackages: [],
  },

  // Build optimizations
  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
