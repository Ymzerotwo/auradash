/**
 * ==========================================
 *      AuraDash Permission Middleware
 * ==========================================
 * 
 * Role & Permission Authorization Middleware
 * 
 * Secures specific routes by checking if the authenticated user has the required
 * role or specific granular permissions stored in their session.
 */

import { Context, Next } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { logger } from '../utils/logger';

/**
 * Authorization middleware that validates user roles and granular permissions.
 * Supports both OR and AND modes for multi-permission checking.
 * 
 * CRITICAL: Direct roles and granular permissions are checked inside a unified loop.
 * This prevents security bypasses where matching a single role in direct mode would 
 * skip check-verifying the remaining requirements under 'AND' mode.
 * 
 * @param allowedRoles - Array of required roles (e.g., 'admin', 'manager') or permission paths (e.g., 'articles.create').
 * @param options - Configuration for checking multiple permissions (mode: 'OR' | 'AND'). Defaults to 'OR'.
 * @returns A Hono middleware function.
 */
export const requirePermission = (allowedRoles: string[], options: { mode?: 'OR' | 'AND' } = { mode: 'OR' }) => {
  return async (c: Context<AppContext>, next: Next) => {
    const reqId = (c.get('requestId') as string) || 'unknown';
    const user = c.get('user');

    // Reject requests if the user is not authenticated or lacks a role entirely.
    if (!user || !user.role) {
      return sendResponse(c, 401, 'UNAUTHORIZED', 'User not authenticated or role missing');
    }
    
    const userRole = user.role.toLowerCase();

    // Superuser Override: Admins bypass all specific permission checks.
    if (userRole === 'admin') {
      return await next();
    }

    // Attempt to parse granular permissions stored in the user session
    let permsObj: any = null;
    if (user.permissions) {
      try {
        permsObj = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
      } catch (e: any) {
        logger.error(reqId, `Failed to parse permissions for user ${user.id}: ${e.message || e}`);
      }
    }

    let metCount = 0;

    // Evaluate each required role/permission rule in allowedRoles
    for (const roleOrPerm of allowedRoles) {
      const roleOrPermLower = roleOrPerm.toLowerCase();
      
      // Check direct legacy role matching (e.g., 'manager')
      if (userRole === roleOrPermLower) {
        metCount++;
        continue;
      }

      // Check granular JSON permissions matching (e.g., 'articles.create' -> permsObj.articles.create)
      if (permsObj) {
        const parts = roleOrPerm.split('.');
        let current: any = permsObj;
        let matched = true;

        for (const part of parts) {
          if (current === undefined || current === null) {
            matched = false;
            break;
          }
          
          // CRITICAL: Prevent Prototype Pollution / Prototype Tampering attacks
          // Reject traversal if path includes special constructor properties.
          if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
            matched = false;
            break;
          }
          
          // Secure property access check
          if (!Object.prototype.hasOwnProperty.call(current, part)) {
            matched = false;
            break;
          }
          current = current[part];
        }

        // The leaf node must be explicitly set to boolean true
        if (matched && current === true) {
          metCount++;
        }
      }
    }

    // Determine final authorization based on the specified mode (AND / OR)
    let hasPermission = false;
    if (options.mode === 'AND') {
      hasPermission = metCount === allowedRoles.length && allowedRoles.length > 0;
    } else {
      hasPermission = metCount > 0;
    }

    if (!hasPermission) {
      logger.warn(reqId, `Forbidden: User ${user.id} with role ${user.role} lacks required permissions: ${allowedRoles.join(', ')}`);
      return sendResponse(c, 403, 'FORBIDDEN', 'You do not have permission to access this resource');
    }

    await next();
  };
};
