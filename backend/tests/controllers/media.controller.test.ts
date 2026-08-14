import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Hono } from 'hono';
import { MediaService } from '../../src/services/media.services';
import mediaRoutes from '../../src/routes/media.routes';
import { MediaUploadError } from '../../src/utils/media-upload';
import { AppContext } from '../../src/types';

const mockEnv = {
  DB: {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue({ id: 'media-1', file_url: '/files/test.jpg' }),
    run: vi.fn().mockResolvedValue({ success: true }),
    all: vi.fn().mockResolvedValue({ results: [] })
  },
  STORAGE: {
    put: vi.fn(),
    delete: vi.fn(),
    get: vi.fn()
  },
  R2_PUBLIC_URL: 'https://cdn.example.com'
};

describe('Pentest: Media Controller & Routes Security', () => {
  let createSpy: any;
  let updateSpy: any;
  let deleteSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the service to prevent real DB inserts and R2 uploads during pentest
    createSpy = vi.spyOn(MediaService, 'createMedia').mockResolvedValue({
      newMedia: {
        id: 'test-id',
        file_name: 'test.jpg',
        file_url: 'https://cdn.example.com/test.jpg',
        mime_type: 'image/jpeg',
        size_bytes: 1024,
        alt_text: null,
        folder: '/',
        created_at: new Date().toISOString()
      }
    } as any);
    
    updateSpy = vi.spyOn(MediaService, 'updateMedia').mockResolvedValue({ success: true } as any);
    deleteSpy = vi.spyOn(MediaService, 'deleteMedia').mockResolvedValue({ success: true } as any);
    vi.spyOn(MediaService, 'getAllMedia').mockResolvedValue({ data: [], meta: {} } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Authorization & RBAC Bypass (Broken Access Control)', () => {
    it('should REJECT uploads without the settings.media permission', async () => {
      const formData = new FormData();
      formData.append('file', new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' }));

      const req = new Request('http://localhost/api/media', {
        method: 'POST',
        body: formData
      });

      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        // User with no permissions
        c.set('user', { id: 'user-123', role: 'user', permissions: {} } as any);
        await next();
      });
      testApp.route('/api/media', mediaRoutes);

      const res = await testApp.fetch(req, mockEnv);
      const data: any = await res.json();

      expect(res.status).toBe(403);
      expect(data.slug).toBe('FORBIDDEN');
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('should ALLOW requests with the correct settings.media permission', async () => {
      const formData = new FormData();
      formData.append('file', new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' }));

      const req = new Request('http://localhost/api/media', {
        method: 'POST',
        body: formData
      });

      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { id: 'admin-123', role: 'user', permissions: { settings: { media: true } } } as any);
        await next();
      });
      testApp.route('/api/media', mediaRoutes);

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(201);
      expect(createSpy).toHaveBeenCalled();
    });
  });

  describe('2. XSS & Sanitization (Stored XSS)', () => {
    let pentestApp: Hono<AppContext>;

    beforeEach(() => {
      pentestApp = new Hono<AppContext>();
      pentestApp.use('*', async (c, next) => {
        c.set('user', { id: 'admin-123', role: 'user', permissions: { settings: { media: true } } } as any);
        await next();
      });
      pentestApp.route('/api/media', mediaRoutes);
    });

    it('should sanitize HTML tags from alt_text and folder during upload', async () => {
      const formData = new FormData();
      formData.append('file', new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' }));
      formData.append('alt_text', '<script>alert("xss")</script>My Image');
      formData.append('folder', '<b>avatars</b>');

      const req = new Request('http://localhost/api/media', {
        method: 'POST',
        body: formData
      });

      const res = await pentestApp.fetch(req, mockEnv);
      expect(res.status).toBe(201);

      // Verify what was sent to the service layer
      const calledAltText = createSpy.mock.calls[0][5];
      const calledFolder = createSpy.mock.calls[0][6];
      expect(calledAltText).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;My Image'); // escaped
      expect(calledFolder).toBe('&lt;b&gt;avatars&lt;/b&gt;'); // escaped HTML tags, slashes preserved
    });

    it('should sanitize HTML tags from body during media update', async () => {
      const req = new Request('http://localhost/api/media/test-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          file_name: 'hacked.jpg<script>alert(1)</script>',
          alt_text: '<img src=x onerror=alert(1)>'
        })
      });

      const res = await pentestApp.fetch(req, mockEnv);
      expect(res.status).toBe(200);

      // Verify what was sent to the service layer
      const calledBody = updateSpy.mock.calls[0][2];
      expect(calledBody.file_name).toBe('hacked.jpg&lt;script&gt;alert(1)&lt;/script&gt;'); // escaped
      expect(calledBody.alt_text).toBe('&lt;img src=x onerror=alert(1)&gt;'); // escaped
    });
  });

  describe('3. Information Disclosure Prevention', () => {
    let pentestApp: Hono<AppContext>;

    beforeEach(() => {
      pentestApp = new Hono<AppContext>();
      pentestApp.use('*', async (c, next) => {
        c.set('user', { id: 'admin-123', role: 'user', permissions: { settings: { media: true } } } as any);
        await next();
      });
      pentestApp.route('/api/media', mediaRoutes);
    });

    it('should NOT leak database or system error messages on 500 errors', async () => {
      // Mock the service to throw a raw database error
      createSpy.mockRejectedValue(new Error('D1_ERROR: SQL syntax error near "INSERT"'));

      const formData = new FormData();
      formData.append('file', new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' }));

      const req = new Request('http://localhost/api/media', {
        method: 'POST',
        body: formData
      });

      const res = await pentestApp.fetch(req, mockEnv);
      const data: any = await res.json();

      expect(res.status).toBe(500);
      expect(data.slug).toBe('INTERNAL_SERVER_ERROR');
      
      // Ensure the error message string is NOT present anywhere in the response
      const responseText = JSON.stringify(data);
      expect(responseText).not.toContain('D1_ERROR');
      expect(responseText).not.toContain('SQL syntax error');
      expect(data.data).toBe(null);
    });
  });

  describe('4. File Content Spoofing & Size Restrictions', () => {
    let pentestApp: Hono<AppContext>;

    beforeEach(() => {
      pentestApp = new Hono<AppContext>();
      pentestApp.use('*', async (c, next) => {
        c.set('user', { id: 'admin-123', role: 'user', permissions: { settings: { media: true } } } as any);
        await next();
      });
      pentestApp.route('/api/media', mediaRoutes);
    });

    it('should reject files exceeding the 100MB payload limit middleware', async () => {
      const req = new Request('http://localhost/api/media', {
        method: 'POST',
        headers: {
          'Content-Length': String(101 * 1024 * 1024),
          'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundarytest'
        },
        body: 'small body'
      });

      const res = await pentestApp.fetch(req, mockEnv);
      
      // Hono's bodyLimit returns 413 Payload Too Large
      expect(res.status).toBe(413);
      const data: any = await res.json();
      expect(data.slug).toBe('PAYLOAD_TOO_LARGE');
    });

    it('should reject spoofed Magic Bytes via Service Error mapping', async () => {
      // We will mock the service to simulate what processAndStoreMedia does when magic bytes fail
      createSpy.mockResolvedValue({
        error: 'MIME_TYPE_MISMATCH',
        message: 'File content does not match the declared file type.',
        status: 400
      });

      const formData = new FormData();
      formData.append('file', new File(['not a jpeg'], 'fake.jpg', { type: 'image/jpeg' }));

      const req = new Request('http://localhost/api/media', {
        method: 'POST',
        body: formData
      });

      // The controller should catch MediaUploadError and return 400 with the specific code
      const res = await pentestApp.fetch(req, mockEnv);
      const data: any = await res.json();

      expect(res.status).toBe(400);
      expect(data.slug).toBe('MIME_TYPE_MISMATCH');
    });

    it('should REJECT path traversal payloads in folder path during upload', async () => {
      const formData = new FormData();
      formData.append('file', new File(['dummy'], 'test.jpg', { type: 'image/jpeg' }));
      formData.append('folder', '../../hacked');

      const req = new Request('http://localhost/api/media', {
        method: 'POST',
        body: formData
      });

      const res = await pentestApp.fetch(req, mockEnv);
      const data: any = await res.json();

      expect(res.status).toBe(400);
      expect(data.slug).toBe('VALIDATION_ERROR');
      expect(data.message).toContain('..');
    });
  });

  describe('5. Data Minimization & Privacy (getAllMedia)', () => {
    let pentestApp: Hono<AppContext>;

    beforeEach(() => {
      pentestApp = new Hono<AppContext>();
      // Mock the service to return sensitive data
      vi.spyOn(MediaService, 'getAllMedia').mockResolvedValue({
        data: [{ id: 'media-1', created_by: 'user-1', created_by_name: 'John Doe', created_at: '2023-01-01', file_name: 'test.jpg' }],
        meta: {}
      } as any);
    });

    it('should STRIP sensitive fields (created_by, created_by_name, created_at) for non-admin users', async () => {
      pentestApp.use('*', async (c, next) => {
        // Non-admin user with media permissions
        c.set('user', { id: 'editor-1', role: 'Editor', permissions: { settings: { media: true } } } as any);
        await next();
      });
      pentestApp.route('/api/media', mediaRoutes);

      const req = new Request('http://localhost/api/media');
      const res = await pentestApp.fetch(req, mockEnv);
      const resData: any = await res.json();

      expect(res.status).toBe(200);
      expect(resData.data.data[0].id).toBe('media-1');
      expect(resData.data.data[0].file_name).toBe('test.jpg');
      expect(resData.data.data[0].created_by).toBeUndefined();
      expect(resData.data.data[0].created_by_name).toBeUndefined();
      expect(resData.data.data[0].created_at).toBeUndefined();
    });

    it('should KEEP sensitive fields for Admin users', async () => {
      pentestApp.use('*', async (c, next) => {
        // Admin user
        c.set('user', { id: 'admin-1', role: 'Admin', permissions: { settings: { media: true } } } as any);
        await next();
      });
      pentestApp.route('/api/media', mediaRoutes);

      const req = new Request('http://localhost/api/media');
      const res = await pentestApp.fetch(req, mockEnv);
      const resData: any = await res.json();

      expect(res.status).toBe(200);
      expect(resData.data.data[0].created_by).toBe('user-1');
      expect(resData.data.data[0].created_by_name).toBe('John Doe');
      expect(resData.data.data[0].created_at).toBe('2023-01-01');
    });
  });

  describe('6. Chunked Multipart Upload Endpoints', () => {
    let app: Hono<AppContext>;

    beforeEach(() => {
      app = new Hono<AppContext>();
      app.use('*', async (c, next) => {
        c.set('user', { id: 'admin-1', role: 'Admin', permissions: { settings: { media: true } } } as any);
        await next();
      });
      app.route('/api/media', mediaRoutes);
    });

    it('should initialize chunked upload successfully', async () => {
      vi.spyOn(MediaService, 'initChunkedUpload').mockResolvedValue({
        uploadId: 'test-upload-id',
        key: 'media/test-video.mp4',
        chunkSizeBytes: 5242880
      } as any);

      const req = new Request('http://localhost/api/media/chunked/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'test-video.mp4',
          mimeType: 'video/mp4',
          fileSize: 10485760
        })
      });

      const res = await app.fetch(req, mockEnv);
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.uploadId).toBe('test-upload-id');
      expect(data.data.key).toBe('media/test-video.mp4');
    });

    it('should complete chunked upload successfully', async () => {
      vi.spyOn(MediaService, 'completeChunkedUpload').mockResolvedValue({
        newMedia: { id: 'media-chunked-1', file_name: 'test-video.mp4' }
      } as any);

      const req = new Request('http://localhost/api/media/chunked/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'media/test-video.mp4',
          uploadId: 'test-upload-id',
          parts: [{ partNumber: 1, etag: 'etag-1' }, { partNumber: 2, etag: 'etag-2' }],
          fileName: 'test-video.mp4',
          mimeType: 'video/mp4',
          fileSize: 10485760
        })
      });

      const res = await app.fetch(req, mockEnv);
      const data: any = await res.json();

      expect(res.status).toBe(201);
      expect(data.data.id).toBe('media-chunked-1');
    });

    it('should abort chunked upload cleanly', async () => {
      vi.spyOn(MediaService, 'abortChunkedUpload').mockResolvedValue({ success: true } as any);

      const req = new Request('http://localhost/api/media/chunked/abort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'media/test-video.mp4',
          uploadId: 'test-upload-id'
        })
      });

      const res = await app.fetch(req, mockEnv);
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.slug).toBe('CHUNKED_ABORTED');
    });
  });
});
