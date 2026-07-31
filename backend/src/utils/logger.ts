/**
 * AuraDash Logger
 * This file contains a lightweight logger tailored for Serverless environments
 * (such as Cloudflare Workers). 
 * Its primary function is to print logs to the Console, attaching the timestamp,
 * log level, and request ID, so they can be automatically captured by log 
 * tracking systems (like Logpush).
 */

/**
 * A utility function to safely stringify complex data.
 * Purpose: Handles circular references to prevent server crashes, 
 * and masks sensitive data (like passwords and tokens) to protect privacy.
 * 
 * @param data The data to stringify
 * @returns Safely stringified text
 */
const safeStringify = (data: any): string => {
  if (typeof data !== 'object' || data === null) return String(data);

  const seen = new WeakSet();
  try {
    return JSON.stringify(data, (key, value) => {
      if (key && /(password|token|authorization|secret)/i.test(key)) {
        return '[REDACTED]';
      }
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      return value;
    });
  } catch {
    return '[Unserializable]';
  }
};

export const logger = {
  /**
   * Logs general information (Info).
   * Purpose: Documents normal system events with the ability to pass additional data.
   */
  info: (reqId: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    const log = `[${timestamp}] [INFO] [ReqID: ${reqId}] ${message}`
    if (data) {
      console.log(log, safeStringify(data))
    } else {
      console.log(log)
    }
  },

  /**
   * Logs warnings (Warn).
   * Purpose: Documents unexpected states or potential issues that do not halt the system.
   */
  warn: (reqId: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    const log = `[${timestamp}] [WARN] [ReqID: ${reqId}] ${message}`
    if (data) {
      console.warn(log, safeStringify(data))
    } else {
      console.warn(log)
    }
  },

  /**
   * Logs errors (Error).
   * Purpose: Documents severe exceptions and crashes, printing the stack trace if available to aid debugging.
   */
  error: (reqId: string, message: string, error?: any) => {
    const timestamp = new Date().toISOString()
    const log = `[${timestamp}] [ERROR] [ReqID: ${reqId}] ${message}`
    if (error) {
      console.error(log, error instanceof Error ? error.stack : safeStringify(error))
    } else {
      console.error(log)
    }
  }
}
