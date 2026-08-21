import type { Dictionary } from '../i18n/dictionaries';
import { ApiError, ValidationError } from './client';

export interface ApiResponse<T = unknown> {
  success: boolean;
  code: number;
  slug: string;
  message: string;
  data?: T;
  details?: ValidationError[];
  meta?: {
    requestId?: string;
    timestamp?: string;
    [key: string]: any;
  };
}

export interface ProcessedResponse<T = unknown> {
  isSuccess: boolean;
  code: number;
  slug: string;
  message: string;
  data: T | null;
  fieldErrors: Record<string, string>;
  meta?: Record<string, any>;
}

/**
 * Resolves a response slug (e.g. APIKEY_INVALID or SESSION_EXPIRED) to a translated message.
 * Checks in order:
 * 1. preferredDict.errors[slug] / preferredDict.success[slug]
 * 2. system.errors[slug] / system.success[slug]
 * 3. common.errors[slug] / common.messages[slug]
 * 4. Fallback to server message or formatted slug
 */
export function resolveSlugTranslation(
  slug: string,
  t?: Dictionary,
  preferredDict?: keyof Dictionary,
  fallbackMessage?: string
): string {
  if (!slug) return fallbackMessage || '';

  const normalizedSlug = slug.toLowerCase();

  if (t) {
    // 1. Check preferred dictionary
    if (preferredDict && t[preferredDict]) {
      const dict = t[preferredDict] as Record<string, any>;
      if (dict.errors && dict.errors[normalizedSlug]) return dict.errors[normalizedSlug];
      if (dict.success && dict.success[normalizedSlug]) return dict.success[normalizedSlug];
      if (dict.messages && dict.messages[normalizedSlug]) return dict.messages[normalizedSlug];
    }

    // 2. Check System dictionary (Dedicated for Middleware and Validation responses)
    if (t.system) {
      if (t.system.errors && (t.system.errors as any)[normalizedSlug]) {
        return (t.system.errors as any)[normalizedSlug];
      }
      if (t.system.validation && (t.system.validation as any)[normalizedSlug]) {
        return (t.system.validation as any)[normalizedSlug];
      }
      if (t.system.success && (t.system.success as any)[normalizedSlug]) {
        return (t.system.success as any)[normalizedSlug];
      }
    }

    // 3. Check Common dictionary
    if (t.common) {
      if (t.common.errors && (t.common.errors as any)[normalizedSlug]) {
        return (t.common.errors as any)[normalizedSlug];
      }
      if (t.common.messages && (t.common.messages as any)[normalizedSlug]) {
        return (t.common.messages as any)[normalizedSlug];
      }
      if (t.common.zod && (t.common.zod as any)[normalizedSlug]) {
        return (t.common.zod as any)[normalizedSlug];
      }
    }
  }

  // 4. Server-provided fallback message or humanized slug
  if (fallbackMessage && fallbackMessage !== 'Unknown Server Error') {
    return fallbackMessage;
  }

  return slug.replace(/_/g, ' ');
}

/**
 * Translates validation error details returned by backend Zod middleware into field-level error messages.
 */
export function resolveValidationDetails(
  details?: ValidationError[],
  t?: Dictionary,
  preferredDict?: keyof Dictionary
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  if (!details || !Array.isArray(details) || details.length === 0) {
    return fieldErrors;
  }

  for (const item of details) {
    if (item.field) {
      const issueKey = item.issue ? item.issue.toLowerCase() : 'invalid';
      let resolved = resolveSlugTranslation(issueKey, t, preferredDict, item.issue);
      
      // If resolution didn't find a key and returned raw slug/string, check system.validation
      if (resolved === issueKey && t?.system?.validation) {
        resolved = (t.system.validation as any)[issueKey] || item.issue || issueKey;
      }
      
      fieldErrors[item.field] = resolved;
    }
  }

  return fieldErrors;
}

/**
 * Standardized Response Handler processor.
 * Accepts raw backend response object or ApiError and returns clean, localized UI payload.
 */
export function processApiResponse<T = unknown>(
  response: ApiResponse<T> | ApiError | unknown,
  t?: Dictionary,
  preferredDict?: keyof Dictionary
): ProcessedResponse<T> {
  if (response instanceof ApiError) {
    const translatedMsg = resolveSlugTranslation(response.slug, t, preferredDict, response.message);
    const fieldErrors = resolveValidationDetails(response.details, t, preferredDict);

    return {
      isSuccess: false,
      code: response.code,
      slug: response.slug,
      message: translatedMsg,
      data: null,
      fieldErrors,
      meta: response.debug,
    };
  }

  const res = response as ApiResponse<T>;
  const isSuccess = Boolean(res && typeof res === 'object' && res.success === true);
  const slug = res?.slug || (isSuccess ? 'SUCCESS' : 'UNKNOWN_ERROR');
  const code = res?.code || (isSuccess ? 200 : 500);
  const message = resolveSlugTranslation(slug, t, preferredDict, res?.message);
  const fieldErrors = resolveValidationDetails(res?.details, t, preferredDict);

  return {
    isSuccess,
    code,
    slug,
    message,
    data: (res?.data ?? null) as T | null,
    fieldErrors,
    meta: res?.meta,
  };
}
