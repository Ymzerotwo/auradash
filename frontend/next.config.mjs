/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet, noimageindex',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
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
  turbopack: {}
};

export default nextConfig;

// Force Next.js dev server to reload and clear Turbopack cache for middleware
if (process.env.NODE_ENV !== 'production') {
  import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
}
