import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: './wrangler.jsonc',
      },
      miniflare: {
        d1Databases: ['DB'],
        kvNamespaces: ['K1'],
        r2Buckets: ['STORAGE'],
      },
    }),
  ],
  test: {
    pool: '@cloudflare/vitest-pool-workers',
    poolOptions: {
      workers: {
        singleWorker: true,
        isolatedStorage: true,
      },
    },
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    alias: {
      'sanitize-html': './tests/mocks/sanitize-html.ts',
      'cloudflare': './tests/mocks/cloudflare.ts'
    },
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/db/**', 'src/index.ts'],
    },
  },
} as any);
