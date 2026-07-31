/**
 * AuraDash Response Formatter
 * This file centralizes the API response formatting logic.
 * It ensures a standardized JSON structure across all endpoints,
 * handles success and error cases, and securely toggles debug information.
 */

import { Context } from 'hono'

export type ResponseMeta = {
  requestId: string
  timestamp: string
}

export type SuccessResponse = {
  success: true
  code: number
  slug: string
  message: string
  data: any
  meta: ResponseMeta
}

export type ErrorResponse = {
  success: false
  code: number
  slug: string
  message: string
  data: null
  meta: ResponseMeta
  details?: any[] // For validation errors (e.g., Zod issues)
  debug?: any // For 500 errors in development (stack traces)
}

/**
 * Creates a standardized JSON response matching the Enterprise API specification.
 * Purpose: Guarantees consistency across all clients, safely redacts sensitive 
 * stack traces in production, and safely formats validation errors.
 * 
 * @param c Hono Context
 * @param code HTTP Status Code
 * @param slug Unique string identifier for the event/error
 * @param message Human readable message
 * @param data Optional payload for success responses
 * @param errorDetails Optional error details (Zod errors or Error instances)
 * @returns Formatted JSON Response
 */
export const sendResponse = (
  c: Context,
  code: number,
  slug: string,
  message: string,
  data: any = null,
  errorDetails?: any
) => {
  const reqId = c.get('requestId') || 'unknown'
  const isSuccess = code >= 200 && code < 300
  const timestamp = new Date().toISOString()
  const envVars = (c.env as any) || (typeof process !== 'undefined' ? process.env : {});
  const envString = String(envVars.ENVIRONMENT || envVars.NODE_ENV || 'production').toLowerCase();
  const isProduction = envString !== 'development' && envString !== 'dev' && envString !== 'local';

  const meta: ResponseMeta = {
    requestId: reqId,
    timestamp,
  }

  // ─── SUCCESS RESPONSE ──────────────────────────────────────────
  if (isSuccess) {
    const response: SuccessResponse = {
      success: true,
      code,
      slug,
      message,
      data,
      meta,
    }
    return c.json(response, code as any)
  }

  // ─── ERROR RESPONSE ────────────────────────────────────────────
  const response: ErrorResponse = {
    success: false,
    code,
    slug,
    message,
    data: null,
    meta,
  }

  if (errorDetails) {
    // 1. Validation Errors (400 Bad Request)
    if (code === 400 && Array.isArray(errorDetails)) {
      response.details = errorDetails.map((err: any) => ({
        // Safely check if path is an array to prevent crashes from unexpected error objects
        field: err.field || (Array.isArray(err.path) ? err.path.join('.') : String(err.path || 'unknown')),
        issue: err.issue || err.message
      }))
    } 
    // 2. System/Internal Errors (500+)
    else if (!isProduction) {
      if (errorDetails instanceof Error) {
        response.debug = {
          error_message: errorDetails.message,
          stack: errorDetails.stack,
        }
      } else {
        response.debug = errorDetails
      }
    }
  }

  return c.json(response, code as any)
}
