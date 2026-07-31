import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UploadController } from '../../src/controllers/upload.controller';
import { UploadService } from '../../src/services/upload.services';
import { MediaUploadError } from '../../src/utils/media-upload';

describe('UploadController', () => {
  let mockContext: any;
  let directUploadSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    directUploadSpy = vi.spyOn(UploadService, 'directUpload');

    mockContext = {
      req: {
        url: 'http://localhost/api/upload',
        parseBody: vi.fn()
      },
      env: {
        STORAGE: {},
        R2_PUBLIC_URL: 'http://url'
      },
      get: vi.fn(),
      json: vi.fn((data, status) => ({ status, data }))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 400 if file is missing', async () => {
    mockContext.req.parseBody.mockResolvedValue({});

    const response: any = await UploadController.directUpload(mockContext);
    expect(response.status).toBe(400);
    expect(response.data.slug).toBe('VALIDATION_ERROR');
  });

  it('should call UploadService and return uploaded URL', async () => {
    const file = new File(['foo'], 'foo.png');
    mockContext.req.parseBody.mockResolvedValue({ file });
    directUploadSpy.mockResolvedValue({ url: 'http://url/foo.png' });

    const response: any = await UploadController.directUpload(mockContext);
    expect(response.status).toBe(200);
    expect(response.data.data.url).toBe('http://url/foo.png');
  });

  it('should handle MediaUploadError exceptions with 400', async () => {
    const file = new File(['foo'], 'foo.png');
    mockContext.req.parseBody.mockResolvedValue({ file });
    directUploadSpy.mockRejectedValue(new MediaUploadError('FILE_TOO_LARGE', 'Max 10MB'));

    const response: any = await UploadController.directUpload(mockContext);
    expect(response.status).toBe(400);
    expect(response.data.slug).toBe('FILE_TOO_LARGE');
  });
});
