import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilesService } from '../../src/services/files.services';

describe('FilesService', () => {
  let mockBucket: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBucket = {
      get: vi.fn()
    };
  });

  it('should return error if file is missing in R2 bucket', async () => {
    mockBucket.get.mockResolvedValue(null);

    const result = await FilesService.getFile(mockBucket as any, 'nonexistent.txt');

    expect(result.error).toBe('FILE_NOT_FOUND');
    expect(result.status).toBe(404);
  });

  it('should return object if file exists', async () => {
    const mockFileObject = {
      writeHttpMetadata: vi.fn(),
      httpEtag: 'etag_123',
      body: 'file_content'
    };
    mockBucket.get.mockResolvedValue(mockFileObject);

    const result = await FilesService.getFile(mockBucket as any, 'test.png');

    expect(result.object).toBe(mockFileObject);
  });
});
