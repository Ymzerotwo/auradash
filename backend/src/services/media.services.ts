/**
 * ==========================================
 *        AuraDash Media Services
 * ==========================================
 * 
 * Business logic layer for managing Media operations.
 */

import { D1Database } from '@cloudflare/workers-types';
import { getPaginationOptions, paginateQuery } from '../utils/pagination';
import { processAndStoreMedia, removeMedia, MediaUploadError, validateMagicBytes } from '../utils/media-upload';
import { escapeLikePattern } from '../utils/sanitize';

// ==========================================
// AuraDash Media Services
// ==========================================
// Business logic layer for managing Media files (Images, Videos).
// Handles direct interactions with D1 Database and Cloudflare R2 Storage.
export const MediaService = {
  /**
   * Retrieves a paginated list of media files, optionally filtered by folder, MIME type, or search term.
   * Performs a LEFT JOIN with the Users table to retrieve the uploader's full name.
   * 
   * @param db - The D1 Database instance.
   */
  getAllMedia: async (db: D1Database, page: any, limit: any, folder: any, mimeType: any, search: any) => {
    const paginationOptions = getPaginationOptions(page, limit, 25);
    let baseQuery = `
      SELECT 
        Media.*, 
        Users.full_name as created_by_name 
      FROM Media 
      LEFT JOIN Users ON Media.created_by = Users.id 
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM Media WHERE 1=1';
    const params: any[] = [];

    if (folder) {
      baseQuery += ' AND Media.folder = ?'; countQuery += ' AND folder = ?'; params.push(folder);
    } else {
      baseQuery += " AND Media.folder != 'avatars'"; countQuery += " AND folder != 'avatars'";
    }

    if (mimeType) {
      baseQuery += ` AND Media.mime_type LIKE ? ESCAPE '\\'`; countQuery += ` AND mime_type LIKE ? ESCAPE '\\'`; params.push(`${escapeLikePattern(mimeType)}%`);
    }

    if (search) {
      baseQuery += ` AND (Media.file_name LIKE ? ESCAPE '\\' OR Media.alt_text LIKE ? ESCAPE '\\')`; countQuery += ` AND (file_name LIKE ? ESCAPE '\\' OR alt_text LIKE ? ESCAPE '\\')`; params.push(`%${escapeLikePattern(search)}%`, `%${escapeLikePattern(search)}%`);
    }

    baseQuery += ' ORDER BY Media.created_at DESC';
    const paginatedData = await paginateQuery(db, baseQuery, countQuery, params, paginationOptions);
    return paginatedData;
  },

  /**
   * Retrieves metadata for a specific media file by its ID.
   * 
   * @param db - The D1 Database instance.
   */
  getMediaById: async (db: D1Database, id: string) => {
    const media = await db.prepare('SELECT * FROM Media WHERE id = ?').bind(id).first();
    if (!media) return { error: 'MEDIA_NOT_FOUND', message: 'Media file not found', status: 404 };
    return { media };
  },

  /**
   * Processes a newly uploaded file and stores it.
   * Delegates heavy lifting (validation, magic bytes checking, R2 upload) to `processAndStoreMedia`.
   * 
   * @param db - The D1 Database instance.
   */
  createMedia: async (db: D1Database, bucket: any, userId: string, r2PublicUrl: string, file: File, alt_text: string | undefined, folder: string | undefined, old_file_url: string | undefined) => {
    try {
      const newMedia = await processAndStoreMedia(file, db, bucket, userId, r2PublicUrl, folder || '/', alt_text, old_file_url);
      return { newMedia };
    } catch (error) {
      if (error instanceof MediaUploadError) return { error: error.code, message: error.message, status: 400 };
      throw error;
    }
  },

  /**
   * Updates metadata for an existing media file (e.g., file_name, alt_text, folder).
   * Note: The actual file content (blob) cannot be updated via this method.
   * 
   * @param db - The D1 Database instance.
   */
  updateMedia: async (db: D1Database, id: string, body: any) => {
    const media = await db.prepare('SELECT id FROM Media WHERE id = ?').bind(id).first();
    if (!media) return { error: 'MEDIA_NOT_FOUND', message: 'Media file not found', status: 404 };

    const updates: string[] = [];
    const params: any[] = [];

    if (body.file_name !== undefined) { updates.push('file_name = ?'); params.push(body.file_name); }
    if (body.alt_text !== undefined) { updates.push('alt_text = ?'); params.push(body.alt_text); }
    if (body.folder !== undefined) { updates.push('folder = ?'); params.push(body.folder); }

    if (updates.length === 0) return { error: 'NO_CHANGES', message: 'No fields provided for update', status: 400 };

    const query = `UPDATE Media SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);
    await db.prepare(query).bind(...params).run();

    return { success: true };
  },

  /**
   * Permanently deletes a media file from both D1 Database and R2 Storage.
   * 
   * @param db - The D1 Database instance.
   */
  deleteMedia: async (db: D1Database, bucket: any, r2PublicUrl: string, id: string) => {
    const success = await removeMedia(id, db, bucket, r2PublicUrl);
    if (!success) return { error: 'MEDIA_NOT_FOUND', message: 'Media file not found', status: 404 };
    return { success: true };
  },

  /**
   * Streams a media file from R2 Storage back to the client as a direct download attachment.
   * Dynamically resolves the R2 object key from the public file URL.
   * 
   * @param db - The D1 Database instance.
   */
  downloadMedia: async (db: D1Database, bucket: any, r2PublicUrl: string, id: string) => {
    const media = await db.prepare('SELECT file_name, file_url, mime_type FROM Media WHERE id = ?').bind(id).first() as any;
    if (!media) return { error: 'MEDIA_NOT_FOUND', message: 'Media file not found', status: 404 };

    let r2Key: string | null = null;
    const fileUrl = media.file_url as string;
    if (fileUrl.startsWith('/files/')) {
      r2Key = fileUrl.replace(/^\/files\//, '');
    } else if (r2PublicUrl && fileUrl.startsWith(r2PublicUrl)) {
      const baseWithSlash = r2PublicUrl.endsWith('/') ? r2PublicUrl : r2PublicUrl + '/';
      r2Key = fileUrl.slice(baseWithSlash.length);
    }

    if (!r2Key) return { error: 'FILE_NOT_FOUND', message: 'Could not resolve file location', status: 404 };

    const object = await bucket.get(r2Key);
    if (!object) return { error: 'FILE_NOT_FOUND', message: 'File not found in storage', status: 404 };

    return { 
      object, 
      fileName: media.file_name as string, 
      mimeType: media.mime_type as string 
    };
  },

  /**
   * Initializes a chunked multipart upload directly with Cloudflare R2.
   */
  initChunkedUpload: async (bucket: any, folder: string = '/', fileName: string, mimeType: string, fileSize: number, altText?: string) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(mimeType)) {
      return { error: 'INVALID_FILE_TYPE', message: 'File format not supported', status: 400 };
    }
    const maxSize = 100 * 1024 * 1024;
    if (fileSize > maxSize) {
      return { error: 'FILE_TOO_LARGE', message: 'File size exceeds 100MB limit', status: 400 };
    }
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const safeFolder = (folder || '').split('/').map(p => p.trim()).filter(p => p && p !== '.' && p !== '..').join('/');
    const cleanFolder = safeFolder ? safeFolder + '/' : '';
    const r2Key = `${cleanFolder}${crypto.randomUUID()}-${sanitizedName}`;

    const mp = await bucket.createMultipartUpload(r2Key, {
      httpMetadata: { contentType: mimeType }
    });

    return {
      uploadId: mp.uploadId,
      key: mp.key,
      chunkSizeBytes: 5 * 1024 * 1024 // Standard 5MB chunk (R2 minimum part size)
    };
  },

  /**
   * Uploads a single chunk/part to Cloudflare R2 multipart upload.
   */
  uploadChunkPart: async (bucket: any, key: string, uploadId: string, partNumber: number, chunkBuffer: ArrayBuffer, mimeType?: string) => {
    if (partNumber === 1 && mimeType) {
      if (!validateMagicBytes(chunkBuffer, mimeType)) {
        return { error: 'MIME_TYPE_MISMATCH', message: 'Invalid file signature detected', status: 400 };
      }
    }
    const mp = bucket.resumeMultipartUpload(key, uploadId);
    const uploadedPart = await mp.uploadPart(partNumber, chunkBuffer);
    return {
      partNumber: uploadedPart.partNumber,
      etag: uploadedPart.etag
    };
  },

  /**
   * Completes the chunked multipart upload, merges parts in R2, and saves to D1 Database.
   */
  completeChunkedUpload: async (db: D1Database, bucket: any, userId: string, r2PublicUrl: string, key: string, uploadId: string, parts: { partNumber: number; etag: string }[], fileName: string, mimeType: string, fileSize: number, folder: string = '/', altText?: string) => {
    const mp = bucket.resumeMultipartUpload(key, uploadId);
    // Sort parts ascending by partNumber as required by Cloudflare R2 / S3 spec
    const sortedParts = [...parts].sort((a, b) => a.partNumber - b.partNumber);
    await mp.complete(sortedParts);

    const baseUrl = r2PublicUrl ? (r2PublicUrl.endsWith('/') ? r2PublicUrl : r2PublicUrl + '/') : '/files/';
    const file_url = `${baseUrl}${key}`;
    const id = crypto.randomUUID();

    await db.prepare(
      `INSERT INTO Media (id, file_name, file_url, mime_type, size_bytes, alt_text, folder, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, fileName, file_url, mimeType, fileSize, altText || null, folder, userId).run();

    const newMedia = await db.prepare(
      `SELECT Media.*, Users.full_name as created_by_name FROM Media LEFT JOIN Users ON Media.created_by = Users.id WHERE Media.id = ?`
    ).bind(id).first();

    return { newMedia };
  },

  /**
   * Aborts an in-progress multipart upload on Cloudflare R2 to clean up storage.
   */
  abortChunkedUpload: async (bucket: any, key: string, uploadId: string) => {
    try {
      const mp = bucket.resumeMultipartUpload(key, uploadId);
      await mp.abort();
      return { success: true };
    } catch {
      return { success: false };
    }
  }
};
