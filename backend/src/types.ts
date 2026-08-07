import { D1Database, R2Bucket, KVNamespace } from '@cloudflare/workers-types';

export type Bindings = {
  DB: D1Database;
  STORAGE: R2Bucket;
  K1: KVNamespace;
  EMAILER?: any;
  R2_PUBLIC_URL: string;
  CLOUDFLARE_API_TOKEN: string;
  PUBLIC_LIMITER: any;
  AUTH_LIMITER: any;
  GLOBAL_LIMITER: any;
  DASHBOARD_LIMITER: any;
  LOGIN_RECOVERY_LIMITER: any;
  VERIFY_CODE_LIMITER: any;
  STATE_LIMITER: any;
  NOTIFICATIONS_LIMITER: any;
  PUBLIC_SUBMISSION_LIMITER: any;
  FILES_LIMITER: any;
  HEALTH_LIMITER: any;
  AURADASH_MASTER_SECRET?: string;
  ALLOWED_ORIGINS?: string;
  CF_ACCOUNT_ID?: string;
  EMAIL_FROM_ADDRESS?: string;
  APP_FRONTEND_URL?: string;
};

export type UserSession = {
  id: string;
  email: string;
  role: string;
  is_banned?: boolean;
  permissions?: string | null;
};

export type AppContext = {
  Bindings: Bindings;
  Variables: {
    user?: UserSession;
    session_id?: string;
    apiKeyDomain?: string;
  };
};
