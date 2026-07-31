declare module 'cloudflare:test' {
  export const env: {
    DB: import('@cloudflare/workers-types').D1Database;
    K1: import('@cloudflare/workers-types').KVNamespace;
    STORAGE: import('@cloudflare/workers-types').R2Bucket;
    EMAILER: any;
    AURADASH_MASTER_SECRET: string;
  };
}

declare global {
  var process: any;
}
