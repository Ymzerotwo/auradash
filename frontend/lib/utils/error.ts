import { ApiError } from '../api/client';
import type { Dictionary } from '../i18n/dictionaries';
import { ZodError } from 'zod';
import { resolveSlugTranslation, resolveValidationDetails } from '../api/responseHandler';

type TranslationFn = any;

export function resolveKey(t: any, path: string): string {
  if (typeof t === "function") {
    return t(path);
  }
  if (t && typeof t === "object") {
    const keys = path.split(".");
    let current = t;
    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        return path;
      }
    }
    return typeof current === "string" ? current : path;
  }
  return path;
}

export function extractZodErrors(error: ZodError, t?: TranslationFn, namespace: string = ''): Record<string, string> {
  const singleErrors: Record<string, string> = {};

  error.issues.forEach((issue) => {
    if (issue.path.length > 0) {
      const pathKey = issue.path.join(".");
      if (!singleErrors[pathKey]) {
        let msg = issue.message;
        if (t && namespace) {
          const baseNs = namespace.split('.')[0];
          const candidates = [
            `${baseNs}.validation.${msg}`,
            `${baseNs}.errors.${msg}`,
            `${baseNs}.${msg}`,
            `common.zod.${msg}`,
            `system.validation.${msg}`,
            `common.errors.${msg}`,
            `common.validation.${msg}`,
          ];

          let resolved = msg;
          for (const candidate of candidates) {
            const res = resolveKey(t, candidate);
            if (res && res !== candidate) {
              resolved = res;
              break;
            }
          }
          msg = resolved;
        } else if (t) {
          msg = resolveKey(t, msg) || msg;
        }
        singleErrors[pathKey] = msg;
      }
    }
  });
  
  return singleErrors;
}

export function extractApiErrors(error: ApiError, t: TranslationFn, namespace: string = 'common.errors'): Record<string, string> {
  if (error.details && error.details.length > 0) {
    return resolveValidationDetails(error.details, t, namespace.split('.')[0] as keyof Dictionary);
  }
  return {};
}

/** A single Zod issue returned inside `ApiError.details` — raw or mapped */
interface ZodIssue {
  path?: (string | number)[];
  message?: string;
  field?: string;
  issue?: string;
  code?: string;
}

export function parseValidationDetails(
  error: unknown
): Record<string, string> | null {
  const isApiError = typeof error === 'object' && error !== null && 'slug' in error && 'details' in error;
  if (!isApiError) return null;
  const err = error as ApiError;
  if (!Array.isArray(err.details) || err.details.length === 0) return null;

  const map: Record<string, string> = {};
  for (const issue of err.details as ZodIssue[]) {
    const path = issue.field ?? (Array.isArray(issue.path) && issue.path.length > 0 ? issue.path.join('.') : '_root');
    const msg = issue.issue ?? issue.message ?? 'Invalid value';
    map[path] = msg;
  }
  return map;
}

export function formatApiError(
  error: unknown,
  fallback = 'An unexpected error occurred'
): string {
  const isApiError = typeof error === 'object' && error !== null && 'slug' in error;
  if (!isApiError) {
    if (error instanceof Error) return error.message || fallback;
    return fallback;
  }
  
  const err = error as ApiError;

  if (err.slug === 'VALIDATION_ERROR' && Array.isArray(err.details) && err.details.length > 0) {
    const fields = (err.details as ZodIssue[])
      .map(i => Array.isArray(i.path) && i.path.length > 0 ? i.path.join('.') : null)
      .filter(Boolean);
    if (fields.length > 0) {
      return `Invalid fields: ${fields.join(', ')}`;
    }
    return 'Please check the highlighted fields and try again.';
  }

  if (err.message && err.message !== 'Unknown Server Error') {
    return err.message;
  }
  return fallback;
}

export function getErrorMessage(
  error: unknown,
  t: Dictionary,
  preferredDict?: keyof Dictionary,
  fallbackMessage = 'common.errors.unknown_error'
): string {
  let slug = '';
  let serverMessage = '';
  const isApiError = typeof error === 'object' && error !== null && 'slug' in error;

  if (isApiError) {
    slug = (error as ApiError).slug;
    serverMessage = (error as ApiError).message;
  } else if (error instanceof Error) {
    slug = error.message;
  } else if (typeof error === 'string') {
    slug = error;
  }

  if (slug) {
    const resolved = resolveSlugTranslation(slug, t, preferredDict, serverMessage);
    if (resolved) return resolved;
  }

  return resolveKey(t, fallbackMessage) || fallbackMessage;
}

export function getSuccessMessage(
  response: unknown,
  t: Dictionary,
  preferredDict?: keyof Dictionary,
  fallbackMessage = 'common.messages.saved_successfully'
): string {
  let slug = '';
  let serverMessage = '';
  
  if (typeof response === 'object' && response !== null && 'slug' in response) {
    slug = (response as any).slug;
    serverMessage = (response as any).message;
  } else if (typeof response === 'string') {
    slug = response;
  }

  if (slug) {
    const resolved = resolveSlugTranslation(slug, t, preferredDict, serverMessage);
    if (resolved) return resolved;
  }

  return resolveKey(t, fallbackMessage) || fallbackMessage;
}
