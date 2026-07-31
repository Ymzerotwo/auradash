import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MediaService } from '../../src/services/media.services';
import * as mediaUpload from '../../src/utils/media-upload';

describe('MediaService', () => {
  let mockDb: any;
  let processAndStoreMediaSpy: any;
  let removeMediaSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    processAndStoreMediaSpy = vi.spyOn(mediaUpload, 'processAndStoreMedia').mockResolvedValue({
      id: 'new_media_123',
      file_name: 'foo.txt',
      file_url: 'http://url/foo.txt',
      mime_type: 'text/plain',
      size_bytes: 100,
      alt_text: 'Alt',
      folder: '/'
    } as any);
    removeMediaSpy = vi.spyOn(mediaUpload, 'removeMedia').mockResolvedValue(true);

    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
      first: vi.fn(),
      all: vi.fn().mockResolvedValue({ results: [] })
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAllMedia', () => {
    it('should query media table with pagination', async () => {
      mockDb.first.mockResolvedValue({ total: 1 });
      mockDb.all.mockResolvedValue({ results: [{ id: '1' }] });

      const result = await MediaService.getAllMedia(mockDb as any, '1', '10', 'images', 'image/png', 'search');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getMediaById', () => {
    it('should return 404 if media not found', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await MediaService.getMediaById(mockDb as any, 'invalid');
      expect(result.error).toBe('MEDIA_NOT_FOUND');
    });
  });

  describe('createMedia', () => {
    it('should store media and return details', async () => {
      const file = new File(['foo'], 'foo.txt');
      const result = await MediaService.createMedia(mockDb as any, {}, 'user_1', 'http://url', file, 'Alt', 'folder', undefined);
      expect(result.newMedia).toBeDefined();
    });
  });

  describe('updateMedia', () => {
    it('should update media successfully', async () => {
      mockDb.first.mockResolvedValue({ id: '1' });

      const result = await MediaService.updateMedia(mockDb as any, '1', { alt_text: 'New Alt' });
      expect(result.success).toBe(true);
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('deleteMedia', () => {
    it('should call removeMedia and return success', async () => {
      const result = await MediaService.deleteMedia(mockDb as any, {}, 'http://url', '1');
      expect(result.success).toBe(true);
    });
  });
});
