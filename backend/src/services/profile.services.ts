/**
 * ==========================================
 *        AuraDash Profile Services
 * ==========================================
 * 
 * Business logic layer for managing Profile operations.
 */

import { logger } from '../utils/logger';
import { D1Database } from '@cloudflare/workers-types';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { removeMediaByUrl } from '../utils/media-upload';

export const ProfileService = {
  /**
   * Performs the Get Profile operation.
   * 
   * @param db - The D1 Database instance.
   */
  getProfile: async (db: D1Database, userId: string) => {
    const result = await db.prepare(
      'SELECT id, username, email, full_name, photo_url, role, job_title, permissions, is_banned, created_at, updated_at FROM Users WHERE id = ?'
    ).bind(userId).first() as any;

    if (!result) {
      return { error: 'USER_NOT_FOUND', message: 'User not found', status: 404 };
    }

    if (result && typeof result.permissions === 'string') {
      try {
        result.permissions = JSON.parse(result.permissions);
      } catch {
        result.permissions = {};
      }
    }

    return { user: result };
  },

  /**
   * Performs the Update Profile operation.
   * 
   * @param db - The D1 Database instance.
   */
  updateProfile: async (db: D1Database, bucket: any, r2PublicUrl: string, user: any, body: any) => {
    const currentUser = await db.prepare('SELECT id, role, password_hash, photo_url FROM Users WHERE id = ?').bind(user.id).first() as any;
    if (!currentUser) return { error: 'USER_NOT_FOUND', message: 'User not found', status: 404 };

    const isAdmin = currentUser.role === 'Admin';
    const updates: string[] = [];
    const params: any[] = [];
    let oldPhotoToDelete: string | null = null;

    if (body.newPassword) {
      if (!body.oldPassword) return { error: 'OLD_PASSWORD_REQUIRED', message: 'Current password is required to set a new one', status: 400 };
      const isOldPasswordCorrect = await verifyPassword(body.oldPassword, currentUser.password_hash as string);
      if (!isOldPasswordCorrect) return { error: 'INVALID_OLD_PASSWORD', message: 'The current password you entered is incorrect', status: 401 };
      const newHashedPassword = await hashPassword(body.newPassword);
      updates.push('password_hash = ?');
      params.push(newHashedPassword);
    }

    if (isAdmin) {
      if (body.username) {
        const collision = await db.prepare('SELECT id FROM Users WHERE username = ? AND id != ?').bind(body.username, user.id).first();
        if (collision) return { error: 'USERNAME_TAKEN', message: 'This username is already in use by another account', status: 400 };
        updates.push('username = ?');
        params.push(body.username);
      }
      if (body.email) {
        const collision = await db.prepare('SELECT id FROM Users WHERE email = ? AND id != ?').bind(body.email, user.id).first();
        if (collision) return { error: 'EMAIL_TAKEN', message: 'This email is already in use by another account', status: 400 };
        updates.push('email = ?');
        params.push(body.email);
      }
      if (body.full_name) { updates.push('full_name = ?'); params.push(body.full_name); }
      if (body.photo_url !== undefined) {
        if (body.photo_url !== currentUser.photo_url && currentUser.photo_url) {
          oldPhotoToDelete = currentUser.photo_url;
        }
        updates.push('photo_url = ?');
        params.push(body.photo_url);
      }
      if (body.job_title !== undefined) { updates.push('job_title = ?'); params.push(body.job_title); }
    } else {
      if (body.full_name) { updates.push('full_name = ?'); params.push(body.full_name); }
      if (body.photo_url !== undefined) {
        if (body.photo_url !== currentUser.photo_url && currentUser.photo_url) {
          oldPhotoToDelete = currentUser.photo_url;
        }
        updates.push('photo_url = ?');
        params.push(body.photo_url);
      }
    }

    if (updates.length === 0) return { error: 'NO_CHANGES', message: 'No valid fields provided for update', status: 400 };

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(user.id);

    await db.prepare(`UPDATE Users SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();

    if (oldPhotoToDelete) {
      try {
        await removeMediaByUrl(oldPhotoToDelete, db, bucket, r2PublicUrl);
      } catch (err) {
        logger.error('system', '[Profile update] Failed to delete old photo:', err);
      }
    }

    return { success: true };
  }
};
