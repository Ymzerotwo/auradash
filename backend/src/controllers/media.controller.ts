/**
 * ==========================================
 *        AuraDash Media Controller
 * ==========================================
 * 
 * Handles HTTP requests for Media operations.
 */

import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { MediaService } from '../services/media.services';
import { sanitizeForDb } from '../utils/sanitize';

// ==========================================
// AuraDash Media Controller
// ==========================================
// Handles HTTP requests related to Media management within the dashboard.
// Acts as the bridge between the routing layer and the business logic (services).
export const MediaController = {
  /**
   * Retrieves a paginated list of Media files.
   * CRITICAL NOTE: If the requesting user is not an Admin, sensitive metadata
   * such as 'created_by', 'created_by_name', and 'created_at' are stripped from the response
   * to protect user privacy.
   * @param c - The Hono request context.
   * 
   * @param c - The Hono HTTP context.
   */
  getAllMedia: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const user = c.get('user');
    try {
      const data = await MediaService.getAllMedia(db, c.req.query('page'), c.req.query('limit'), c.req.query('folder'), c.req.query('mime_type'), c.req.query('search'));
      
      if (user?.role?.toLowerCase() !== 'admin' && data.data) {
        data.data = data.data.map((item: any) => {
          const { created_by, created_by_name, created_at, ...rest } = item;
          return rest;
        });
      }

      return sendResponse(c, 200, 'MEDIA_RETRIEVED', 'Media retrieved successfully', data);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve media');
    }
  },

  /**
   * Retrieves a single Media file by its ID.
   * @param c - The Hono request context.
   * 
   * @param c - The Hono HTTP context.
   */
  getMediaById: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    try {
      const result = await MediaService.getMediaById(db, c.req.param('id') as string);
      if (result.error) return sendResponse(c, result.status as any, result.error, result.message);
      return sendResponse(c, 200, 'MEDIA_RETRIEVED', 'Media retrieved successfully', result.media);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve media');
    }
  },

  /**
   * Creates a new Media file (Upload).
   * CRITICAL NOTE: This endpoint uses FormData and handles file validation manually
   * (instead of Zod) to check for magic bytes and prevent malicious uploads.
   * Path traversal (../) in folders is strictly blocked.
   * @param c - The Hono request context.
   * 
   * @param c - The Hono HTTP context.
   */
  createMedia: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const bucket = c.env.STORAGE;
    const user = c.get('user');

    const body = await c.req.parseBody();
    const file = body['file'];
    let alt_text = body['alt_text'] as string | undefined;
    let folder = body['folder'] as string | undefined;
    const old_file_url = body['old_file_url'] as string | undefined;

    if (alt_text) alt_text = sanitizeForDb(alt_text);
    if (folder) {
      folder = folder.trim();
      if (folder.includes('..')) {
        return sendResponse(c, 400, 'VALIDATION_ERROR', 'Folder path cannot contain ".."');
      }
      folder = sanitizeForDb(folder); // Apply sanitizeForDb (which ignores slashes but catches HTML tags)
    }

    if (!file || !(file instanceof File)) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'File is required in the form data');
    }

    try {
      const result = await MediaService.createMedia(db, bucket, user!.id, c.env.R2_PUBLIC_URL, file, alt_text, folder, old_file_url);
      if (result.error) return sendResponse(c, result.status as any, result.error, result.message);
      return sendResponse(c, 201, 'MEDIA_CREATED', 'Media file uploaded successfully', result.newMedia);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to create media');
    }
  },

  /**
   * Updates an existing Media file's metadata.
   * @param c - The Hono request context.
   * 
   * @param c - The Hono HTTP context.
   */
  updateMedia: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    let body = c.req.valid('json' as never) as any;

    try {
      const result = await MediaService.updateMedia(db, c.req.param('id') as string, body);
      if (result.error) return sendResponse(c, result.status as any, result.error, result.message);
      return sendResponse(c, 200, 'MEDIA_UPDATED', 'Media updated successfully');
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to update media');
    }
  },

  /**
   * Deletes a Media file completely from both the database and R2 storage.
   * @param c - The Hono request context.
   * 
   * @param c - The Hono HTTP context.
   */
  deleteMedia: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const bucket = c.env.STORAGE;
    try {
      const result = await MediaService.deleteMedia(db, bucket, c.env.R2_PUBLIC_URL, c.req.param('id') as string);
      if (result.error) return sendResponse(c, result.status as any, result.error, result.message);
      return sendResponse(c, 200, 'MEDIA_DELETED', 'Media deleted successfully');
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to delete media');
    }
  },

  /**
   * Downloads a Media file directly from the backend.
   * Enforces correct Content-Disposition to force a browser download rather than inline viewing.
   * @param c - The Hono request context.
   * 
   * @param c - The Hono HTTP context.
   */
  downloadMedia: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const bucket = c.env.STORAGE;
    try {
      const result = await MediaService.downloadMedia(db, bucket, c.env.R2_PUBLIC_URL, c.req.param('id') as string);
      if (result.error) return sendResponse(c, result.status as any, result.error, result.message);

      const object = result.object!;
      const headers = new Headers();
      object.writeHttpMetadata(headers);

      const mimeToExt: Record<string, string> = {
        'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'video/mp4': '.mp4', 'video/webm': '.webm',
      };
      let downloadName = result.fileName!;
      const expectedExt = mimeToExt[result.mimeType!];
      if (expectedExt && !downloadName.toLowerCase().endsWith(expectedExt)) {
        downloadName = downloadName + expectedExt;
      }

      headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);
      headers.set('Cache-Control', 'no-cache');

      return new Response(object.body, { headers });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to download media');
    }
  },

  /**
   * Initializes a chunked multipart upload session.
   */
  initChunkedUpload: async (c: Context<AppContext>) => {
    const bucket = c.env.STORAGE;
    const body = await c.req.json().catch(() => ({}));
    const { fileName, mimeType, fileSize, folder, altText } = body;

    if (!fileName || !mimeType || !fileSize) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'fileName, mimeType, and fileSize are required');
    }

    try {
      const result = await MediaService.initChunkedUpload(bucket, folder, fileName, mimeType, fileSize, altText);
      if ((result as any).error) {
        return sendResponse(c, (result as any).status || 400, (result as any).error, (result as any).message);
      }
      return sendResponse(c, 200, 'CHUNKED_INIT_SUCCESS', 'Chunked upload initialized', result);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to initialize chunked upload', null, error.message);
    }
  },

  /**
   * Uploads an individual chunk part.
   */
  uploadChunkPart: async (c: Context<AppContext>) => {
    const bucket = c.env.STORAGE;
    const body = await c.req.parseBody();
    const key = body['key'] as string;
    const uploadId = body['uploadId'] as string;
    const partNumber = parseInt(body['partNumber'] as string, 10);
    const mimeType = body['mimeType'] as string | undefined;
    const chunk = body['chunk'];

    if (!key || !uploadId || isNaN(partNumber) || !chunk || !(chunk instanceof File)) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'key, uploadId, partNumber, and chunk file are required');
    }

    try {
      const chunkBuffer = await chunk.arrayBuffer();
      const result = await MediaService.uploadChunkPart(bucket, key, uploadId, partNumber, chunkBuffer, mimeType);
      if ((result as any).error) {
        return sendResponse(c, (result as any).status || 400, (result as any).error, (result as any).message);
      }
      return sendResponse(c, 200, 'CHUNK_UPLOADED', 'Part uploaded successfully', result);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to upload chunk part', null, error.message);
    }
  },

  /**
   * Completes and finalizes the chunked upload.
   */
  completeChunkedUpload: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const bucket = c.env.STORAGE;
    const user = c.get('user');

    if (!user) {
      return sendResponse(c, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    const body = await c.req.json().catch(() => ({}));
    const { key, uploadId, parts, fileName, mimeType, fileSize, folder, altText } = body;

    if (!key || !uploadId || !Array.isArray(parts) || parts.length === 0 || !fileName || !mimeType || !fileSize) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Missing required fields to complete multipart upload');
    }

    try {
      const r2PublicUrl = c.env.R2_PUBLIC_URL || '';
      const result = await MediaService.completeChunkedUpload(
        db, bucket, user.id, r2PublicUrl, key, uploadId, parts, fileName, mimeType, fileSize, folder, altText
      );
      return sendResponse(c, 201, 'MEDIA_CREATED', 'Media file uploaded successfully', result.newMedia);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to complete chunked upload', null, error.message);
    }
  },

  /**
   * Aborts a chunked upload.
   */
  abortChunkedUpload: async (c: Context<AppContext>) => {
    const bucket = c.env.STORAGE;
    const body = await c.req.json().catch(() => ({}));
    const { key, uploadId } = body;

    if (!key || !uploadId) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'key and uploadId are required');
    }

    try {
      await MediaService.abortChunkedUpload(bucket, key, uploadId);
      return sendResponse(c, 200, 'CHUNKED_ABORTED', 'Upload aborted successfully');
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to abort chunked upload');
    }
  }
};
