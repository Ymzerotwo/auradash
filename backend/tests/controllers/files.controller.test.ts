import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FilesController } from '../../src/controllers/files.controller';
import { FilesService } from '../../src/services/files.services';

describe('FilesController', () => {
  let mockContext: any;
  let getFileSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    getFileSpy = vi.spyOn(FilesService, 'getFile');

    mockContext = {
      req: {
        url: 'http://localhost/files/test.png',
        path: '/files/test.png'
      },
      env: {
        STORAGE: {}
      },
      get: vi.fn(),
      json: vi.fn((data, status) => ({ status, data }))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 400 if path contains directory traversal dot-dots', async () => {
    mockContext.req.path = '/files/../etc/passwd';
    mockContext.req.url = 'http://localhost/files/../etc/passwd';

    const response: any = await FilesController.serveFile(mockContext);
    expect(response.status).toBe(400);
    expect(response.data.slug).toBe('INVALID_PATH');
  });

  it('should call FilesService and return raw Response body on success', async () => {
    const mockHeaders = new Headers();
    mockHeaders.set('Content-Type', 'image/png');

    getFileSpy.mockResolvedValue({
      object: {
        body: 'raw_data',
        writeHttpMetadata: vi.fn((headers: Headers) => {
          headers.set('Content-Type', 'image/png');
        }),
        httpEtag: 'test-etag'
      },
      headers: mockHeaders
    });

    const response: any = await FilesController.serveFile(mockContext);
    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get('Content-Type')).toBe('image/png');
  });

  it('should return 404 if FilesService returns error', async () => {
    getFileSpy.mockResolvedValue({
      error: 'FILE_NOT_FOUND',
      status: 404,
      message: 'Not Found'
    });

    const response: any = await FilesController.serveFile(mockContext);
    expect(response.status).toBe(404);
    expect(response.data.slug).toBe('FILE_NOT_FOUND');
  });
});
