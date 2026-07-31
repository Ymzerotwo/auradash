/**
 *
 * AuraDash Media Upload Utility
 * Secure utility for validating, processing, and storing media files in Cloudflare R2 and D1.
 * Prevents malicious uploads, path traversals, spoofed MIME types, and arbitrary deletions.
 */

import { D1Database, R2Bucket } from '@cloudflare/workers-types';

export class MediaUploadError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'MediaUploadError';
  }
}

/**
 * Magic bytes for validating actual file content vs spoofed MIME type.
 * This prevents attacks where an executable (.exe) is maliciously renamed to .jpg
 * to bypass file extension checks.
 */
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
  'image/gif': [[0x47, 0x49, 0x46, 0x38]], // GIF8
  'video/mp4': [], // MP4 has highly variable headers — we skip magic check and rely on MIME
  'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]], // EBML header
};

/**
 * Validates that file content matches its declared MIME type by inspecting the first few bytes.
 * Returns false if the file's actual bytes don't match the expected signature.
 */
export function validateMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures || signatures.length === 0) return true; // No signature configured to check

  const bytes = new Uint8Array(buffer.slice(0, 8));
  return signatures.some(sig =>
    sig.every((byte, i) => bytes[i] === byte)
  );
}

const MAX_FILENAME_LENGTH = 255;

/**
 * Extract the R2 object key from a public file URL.
 * Handles both legacy relative paths (/files/...) and full R2 public URLs.
 */
function extractR2Key(fileUrl: string, r2PublicUrl?: string): string | null {
  if (!fileUrl) return null;

  // Legacy format: /files/<key>
  if (fileUrl.startsWith('/files/')) {
    return fileUrl.replace(/^\/files\//, '');
  }

  // Full R2 URL format: https://<account>.r2.cloudflarestorage.com/<bucket>/<key>
  if (r2PublicUrl && fileUrl.startsWith(r2PublicUrl)) {
    const baseWithSlash = r2PublicUrl.endsWith('/') ? r2PublicUrl : r2PublicUrl + '/';
    return fileUrl.slice(baseWithSlash.length);
  }

  return null;
}

/**
 * Safely processes, validates, and stores media files into Cloudflare R2 and D1.
 * Enforces strict security rules against large files, invalid types, and path traversal.
 */
export async function processAndStoreMedia(
  file: File,
  db: D1Database,
  bucket: R2Bucket,
  userId: string,
  r2PublicUrl: string,
  folder: string = '/',
  altText?: string,
  oldFileUrl?: string
) {
  // Security: Only allow safe raster image and video formats.
  // SVG is intentionally excluded because it can execute malicious JavaScript (XSS vector).
  // PDF is excluded because it can carry payloads and requires separate handling.
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm'
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new MediaUploadError('INVALID_FILE_TYPE', 'File format is not supported. Allowed: JPG, PNG, WEBP, GIF, MP4, WebM');
  }

  const maxSize = 100 * 1024 * 1024; // 100 MB hard limit to prevent storage exhaustion
  if (file.size > maxSize) {
    throw new MediaUploadError('FILE_TOO_LARGE', 'File size exceeds 100MB limit');
  }

  // Validate filename length to prevent DoS attacks against R2's path limitations
  if (file.name.length > MAX_FILENAME_LENGTH) {
    throw new MediaUploadError('FILENAME_TOO_LONG', `Filename exceeds ${MAX_FILENAME_LENGTH} character limit`);
  }

  // Read file buffer for magic byte validation
  const fileBuffer = await file.arrayBuffer();

  // Verify actual file content matches declared MIME type
  if (!validateMagicBytes(fileBuffer, file.type)) {
    throw new MediaUploadError('MIME_TYPE_MISMATCH', 'File content does not match the declared file type. Possible spoofing detected.');
  }

  // Sanitize filename to prevent Path Traversal or broken URLs
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

  // Safely parse folder to prevent directory traversal attacks (../)
  const safeFolder = (folder || '')
    .split('/')
    .map(p => p.trim())
    .filter(p => p && p !== '.' && p !== '..')
    .join('/');
  const cleanFolder = safeFolder ? safeFolder + '/' : '';

  const r2Key = `${cleanFolder}${crypto.randomUUID()}-${sanitizedName}`;

  // Store in Cloudflare R2
  await bucket.put(r2Key, fileBuffer, {
    httpMetadata: { contentType: file.type },
  });

  // Build the public-facing URL that points directly to R2 for fast delivery
  const baseUrl = r2PublicUrl.endsWith('/') ? r2PublicUrl : r2PublicUrl + '/';
  const file_url = `${baseUrl}${r2Key}`;
  const id = crypto.randomUUID();

  // If replacing an old file, remove the old one first.
  if (oldFileUrl) {
    await removeMediaByUrl(oldFileUrl, db, bucket, r2PublicUrl);
  }

  await db.prepare(
    `INSERT INTO Media (id, file_name, file_url, mime_type, size_bytes, alt_text, folder, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    file.name,
    file_url,
    file.type,
    file.size,
    altText || null,
    folder,
    userId
  ).run();

  const newMedia = await db.prepare('SELECT * FROM Media WHERE id = ?').bind(id).first();
  return newMedia;
}

/**
 * Removes a media file from both D1 Database and R2 Bucket using its ID.
 * Purpose: Securely deletes media.
 * 
 * @param id The media ID
 * @param db D1 Database instance
 * @param bucket R2 Bucket instance
 * @param r2PublicUrl Public R2 URL base
 */
export async function removeMedia(
  id: string,
  db: D1Database,
  bucket: R2Bucket,
  r2PublicUrl?: string
): Promise<boolean> {
  const media = await db.prepare('SELECT id, file_url FROM Media WHERE id = ?').bind(id).first() as any;
  if (!media) return false;

  const r2Key = extractR2Key(media.file_url as string, r2PublicUrl);
  if (r2Key) {
    try { await bucket.delete(r2Key); } catch { }
  }

  await db.prepare('DELETE FROM Media WHERE id = ?').bind(id).run();
  return true;
}

/**
 * Removes a media file from both D1 Database and R2 Bucket using its public URL.
 * Purpose: Securely deletes media by URL, preventing arbitrary deletion.
 * 
 * @param fileUrl The public URL of the media
 * @param db D1 Database instance
 * @param bucket R2 Bucket instance
 * @param r2PublicUrl Public R2 URL base
 */
export async function removeMediaByUrl(
  fileUrl: string,
  db: D1Database,
  bucket: R2Bucket,
  r2PublicUrl?: string
): Promise<boolean> {
  const media = await db.prepare('SELECT id FROM Media WHERE file_url = ?').bind(fileUrl).first() as any;
  if (!media) {
    // Dangerous fallback removed: We no longer blindly delete from R2 
    // to prevent arbitrary unauthenticated file deletion vulnerabilities.
    return false;
  }
  return removeMedia(media.id, db, bucket, r2PublicUrl);
}
