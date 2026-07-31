import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UploadService } from '../../src/services/upload.services';
import * as mediaUpload from '../../src/utils/media-upload';

describe('UploadService', () => {
  let mockBucket: any;
  let validateMagicBytesSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    validateMagicBytesSpy = vi.spyOn(mediaUpload, 'validateMagicBytes').mockReturnValue(true);

    mockBucket = {
      put: vi.fn().mockResolvedValue(undefined)
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw MediaUploadError if file type is not allowed', async () => {
    const file = new File(['foo'], 'foo.pdf', { type: 'application/pdf' });

    await expect(UploadService.directUpload(mockBucket as any, 'http://url', file))
      .rejects.toThrow('Only standard image and video files are allowed');
  });

  it('should throw MediaUploadError if file is too large', async () => {
    const file = new File(['foo'], 'foo.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 101 * 1024 * 1024 }); // 101MB

    await expect(UploadService.directUpload(mockBucket as any, 'http://url', file))
      .rejects.toThrow('File size exceeds 100MB limit');
  });

  it('should put file in R2 bucket and return URL', async () => {
    const file = new File(['foo'], 'foo.png', { type: 'image/png' });
    validateMagicBytesSpy.mockReturnValue(true);

    const result = await UploadService.directUpload(mockBucket as any, 'http://url', file);
    expect(result.url).toBeDefined();
    expect(mockBucket.put).toHaveBeenCalled();
  });
});
