import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateMagicBytes, MediaUploadError, processAndStoreMedia, removeMedia, removeMediaByUrl } from '../../src/utils/media-upload';

// ─── validateMagicBytes Tests ───────────────────────────────────────────────────

describe('Utils: Media Upload - validateMagicBytes', () => {
  const createBuffer = (bytes: number[]): ArrayBuffer => {
    const buffer = new ArrayBuffer(bytes.length);
    const view = new Uint8Array(buffer);
    bytes.forEach((b, i) => view[i] = b);
    return buffer;
  };

  it('should validate JPEG magic bytes (FF D8 FF)', () => {
    const buffer = createBuffer([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    expect(validateMagicBytes(buffer, 'image/jpeg')).toBe(true);
  });

  it('should reject non-JPEG content claiming to be JPEG', () => {
    const buffer = createBuffer([0x89, 0x50, 0x4E, 0x47]); // PNG bytes
    expect(validateMagicBytes(buffer, 'image/jpeg')).toBe(false);
  });

  it('should validate PNG magic bytes (89 50 4E 47)', () => {
    const buffer = createBuffer([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    expect(validateMagicBytes(buffer, 'image/png')).toBe(true);
  });

  it('should reject non-PNG content claiming to be PNG', () => {
    const buffer = createBuffer([0xFF, 0xD8, 0xFF]); // JPEG bytes
    expect(validateMagicBytes(buffer, 'image/png')).toBe(false);
  });

  it('should validate WebP magic bytes (RIFF header)', () => {
    // RIFF....WEBP
    const buffer = createBuffer([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]);
    expect(validateMagicBytes(buffer, 'image/webp')).toBe(true);
  });

  it('should validate GIF magic bytes (GIF8)', () => {
    // GIF89a
    const buffer = createBuffer([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(validateMagicBytes(buffer, 'image/gif')).toBe(true);
  });

  it('should validate WebM magic bytes (EBML header)', () => {
    const buffer = createBuffer([0x1A, 0x45, 0xDF, 0xA3]);
    expect(validateMagicBytes(buffer, 'video/webm')).toBe(true);
  });

  it('should skip validation for MP4 (variable headers)', () => {
    // MP4 has no fixed magic bytes — should always return true
    const buffer = createBuffer([0x00, 0x00, 0x00, 0x20]);
    expect(validateMagicBytes(buffer, 'video/mp4')).toBe(true);
  });

  it('should return true for unknown MIME types (no signatures to check)', () => {
    const buffer = createBuffer([0x00, 0x00, 0x00, 0x00]);
    expect(validateMagicBytes(buffer, 'application/octet-stream')).toBe(true);
  });

  it('should reject HTML content disguised as image/png', () => {
    // <html> starts with 0x3C = '<'
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode('<html><script>alert(1)</script></html>');
    expect(validateMagicBytes(htmlBytes.buffer as ArrayBuffer, 'image/png')).toBe(false);
  });

  it('should reject SVG content disguised as image/jpeg', () => {
    const encoder = new TextEncoder();
    const svgBytes = encoder.encode('<?xml version="1.0"?><svg xmlns="...');
    expect(validateMagicBytes(svgBytes.buffer as ArrayBuffer, 'image/jpeg')).toBe(false);
  });
});

// ─── MediaUploadError Tests ─────────────────────────────────────────────────────

describe('Utils: Media Upload - MediaUploadError', () => {
  it('should create error with code and message', () => {
    const error = new MediaUploadError('INVALID_FILE_TYPE', 'Bad file');
    expect(error.code).toBe('INVALID_FILE_TYPE');
    expect(error.message).toBe('Bad file');
    expect(error.name).toBe('MediaUploadError');
    expect(error).toBeInstanceOf(Error);
  });

  it('should have a stack trace', () => {
    const error = new MediaUploadError('TEST', 'Test error');
    expect(error.stack).toBeDefined();
  });
});

describe('Utils: Media Upload - processAndStoreMedia & Deletion Integration', () => {
  let mockDb: any;
  let mockBucket: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true }),
      first: vi.fn().mockResolvedValue({ id: 'media-123', file_url: 'https://r2.com/test.png' }),
    };

    mockBucket = {
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('should throw INVALID_FILE_TYPE when attempting to upload an SVG file', async () => {
    const file = new File([new ArrayBuffer(10)], 'malicious.svg', { type: 'image/svg+xml' });
    await expect(
      processAndStoreMedia(file, mockDb, mockBucket, 'user-123', 'https://r2.com')
    ).rejects.toThrowError('File format is not supported. Allowed: JPG, PNG, WEBP, GIF, MP4, WebM');
  });

  it('should throw FILE_TOO_LARGE when file size exceeds 100MB', async () => {
    const file = new File([new ArrayBuffer(10)], 'huge-video.mp4', { type: 'video/mp4' });
    // Override size property of File
    Object.defineProperty(file, 'size', { value: 101 * 1024 * 1024 });

    await expect(
      processAndStoreMedia(file, mockDb, mockBucket, 'user-123', 'https://r2.com')
    ).rejects.toThrowError('File size exceeds 100MB limit');
  });

  it('should throw FILENAME_TOO_LONG when filename exceeds 255 characters', async () => {
    const longName = 'a'.repeat(256) + '.png';
    const file = new File([new ArrayBuffer(10)], longName, { type: 'image/png' });

    await expect(
      processAndStoreMedia(file, mockDb, mockBucket, 'user-123', 'https://r2.com')
    ).rejects.toThrowError('Filename exceeds 255 character limit');
  });

  it('should throw MIME_TYPE_MISMATCH when magic bytes do not match the declared MIME type', async () => {
    const file = new File([new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0])], 'spoofed.png', { type: 'image/png' });

    await expect(
      processAndStoreMedia(file, mockDb, mockBucket, 'user-123', 'https://r2.com')
    ).rejects.toThrowError('File content does not match the declared file type. Possible spoofing detected.');
  });

  it('should process and store valid files successfully in both R2 and D1', async () => {
    // PNG bytes signature (89 50 4E 47) to pass validateMagicBytes
    const file = new File([new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0, 0, 0, 0])], 'valid.png', { type: 'image/png' });

    const result = await processAndStoreMedia(file, mockDb, mockBucket, 'user-123', 'https://r2.com', '/uploads', 'alt text');

    expect(mockBucket.put).toHaveBeenCalledOnce();
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO Media'));
    expect(mockDb.bind).toHaveBeenCalled();
    expect(result).toEqual({ id: 'media-123', file_url: 'https://r2.com/test.png' });
  });

  it('should return false when trying to remove a non-existent media item by ID', async () => {
    mockDb.first.mockResolvedValue(null);
    const result = await removeMedia('missing-id', mockDb, mockBucket, 'https://r2.com');
    expect(result).toBe(false);
  });

  it('should delete from R2 and D1 when removing media by ID', async () => {
    mockDb.first.mockResolvedValue({ id: 'media-123', file_url: 'https://r2.com/uploads/some-key-test.png' });
    const result = await removeMedia('media-123', mockDb, mockBucket, 'https://r2.com');

    expect(result).toBe(true);
    expect(mockBucket.delete).toHaveBeenCalledWith('uploads/some-key-test.png');
    expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM Media WHERE id = ?');
  });

  it('should return false when trying to remove media by a non-existent public URL', async () => {
    mockDb.first.mockResolvedValue(null);
    const result = await removeMediaByUrl('https://r2.com/unknown.png', mockDb, mockBucket, 'https://r2.com');
    expect(result).toBe(false);
  });
});
