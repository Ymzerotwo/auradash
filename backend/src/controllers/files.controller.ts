/**
 * ==========================================
 *        AuraDash Files Controller
 * ==========================================
 * 
 * [INACTIVE / DISABLED] Note: This controller is currently INACTIVE / UNUSED.
 * It was intended for proxying file downloads through backend Workers,
 * but files are currently served directly via Cloudflare R2 Public URL.
 */

import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { FilesService } from '../services/files.services';

// NOTE: This controller is currently UNUSED.
// It was intended for serving files securely through the backend,
// but files are currently being served directly from the R2 public URL.
export const FilesController = {
  /**
   * Handles the Serve File operation.
   * 
   * @param c - The Hono HTTP context.
   */
  serveFile: async (c: Context<AppContext>) => {
    // Extract filename safely, handling potential subdirectories
    // Replace the mount point `/files/` to get the actual key
    const rawFilename = c.req.path.replace(/^\/files\//, '');
    
    // Security: Prevent path traversal
    if (rawFilename.includes('..') || rawFilename.startsWith('/')) {
      return sendResponse(c, 400, 'INVALID_PATH', 'Invalid file path');
    }

    const filename = decodeURIComponent(rawFilename);
    const bucket = c.env.STORAGE;
    try {
      const result = await FilesService.getFile(bucket, filename);
      
      if (result.error) {
        return sendResponse(c, result.status as any, result.error, result.message);
      }

      const object = result.object!;
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Cache-Control', 'public, max-age=86400, immutable');

      // Security: Prevent script execution from user-uploaded files (e.g., SVGs bypassing filters)
      headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox allow-same-origin;");
      headers.set('X-Content-Type-Options', 'nosniff');

      return new Response(object.body, { headers });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve file', null, error.message);
    }
  }
};
