/**
 * ==========================================
 *        AuraDash Upload Services
 * ==========================================
 * 
 * Business logic layer for managing Upload operations.
 */

import { R2Bucket } from '@cloudflare/workers-types';
import { MediaUploadError, validateMagicBytes } from '../utils/media-upload';

export const UploadService = {
  /**
   * Performs the Direct Upload operation.
   * 
   * @param db - The D1 Database instance.
   */
  directUpload: async (bucket: R2Bucket, r2PublicUrl: string, file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/ogg'];
    
    if (!allowedTypes.includes(file.type)) {
      throw new MediaUploadError('INVALID_FILE_TYPE', 'Only standard image and video files are allowed');
    }

    const maxSize = 100 * 1024 * 1024; // 100 MB limit for direct upload
    if (file.size > maxSize) {
      throw new MediaUploadError('FILE_TOO_LARGE', 'File size exceeds 100MB limit');
    }

    const fileBuffer = await file.arrayBuffer();

    // Security: Verify actual file content matches declared MIME type
    if (!validateMagicBytes(fileBuffer, file.type)) {
      throw new MediaUploadError('MIME_TYPE_MISMATCH', 'File content does not match the declared file type');
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${crypto.randomUUID()}-${sanitizedName}`;

    await bucket.put(filename, fileBuffer, {
      httpMetadata: { contentType: file.type },
    });

    const baseUrl = r2PublicUrl.endsWith('/') ? r2PublicUrl : r2PublicUrl + '/';
    return { url: `${baseUrl}${filename}` };
  }
};
