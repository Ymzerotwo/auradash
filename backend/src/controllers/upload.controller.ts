/**
 * ==========================================
 *        AuraDash Upload Controller
 * ==========================================
 * 
 * Handles HTTP requests for Upload operations.
 */

import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { UploadService } from '../services/upload.services';
import { MediaUploadError } from '../utils/media-upload';

export const UploadController = {
  /**
   * Handles the Direct Upload operation.
   * 
   * @param c - The Hono HTTP context.
   */
  directUpload: async (c: Context<AppContext>) => {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'File is required in the form data');
    }

    const bucket = c.env.STORAGE;
    const r2PublicUrl = c.env.R2_PUBLIC_URL;

    try {
      const result = await UploadService.directUpload(bucket, r2PublicUrl, file);
      return sendResponse(c, 200, 'FILE_UPLOADED', 'File uploaded successfully', { url: result.url });
    } catch (error: any) {
      if (error instanceof MediaUploadError) {
        return sendResponse(c, 400, error.code, error.message);
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to upload file', null, error.message);
    }
  }
};
