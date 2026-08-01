/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
// @ts-nocheck
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8787',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      }
    ],
  },
  webpack: (config, { dev, isServer }) => {
    return config;
  },
  turbopack: {
    root: __dirname,
  }
};

export default nextConfig;

// Force Next.js dev server to reload and clear Turbopack cache for middleware
if (process.env.NODE_ENV !== 'production') {
  import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
}
