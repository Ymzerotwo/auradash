import { apiClient } from '../api/client';

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
  speedBytesPerSec: number;
  estimatedRemainingSec: number;
}

export interface MediaItem {
  id: string;
  file_name: string;
  file_url: string;
  mime_type: string;
  size_bytes: number;
  alt_text: string | null;
  folder: string;
  created_by?: string;
  created_by_name?: string;
  created_at?: string;
}

export interface PaginatedMedia {
  data: MediaItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MediaQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  folder?: string;
  mime_type?: string;
}

export const MediaService = {
  async getAll(params: MediaQueryParams): Promise<PaginatedMedia> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.search) query.append('search', params.search);
    if (params.folder) query.append('folder', params.folder);
    if (params.mime_type) query.append('mime_type', params.mime_type);

    const response = await apiClient.get<{ data: PaginatedMedia }>(`/media?${query.toString()}`);
    return response.data;
  },

  async uploadMedia(file: File, folder: string = '/', altText?: string): Promise<MediaItem> {
    return this.uploadMediaWithProgress(file, folder, altText);
  },

  async uploadMediaWithProgress(
    file: File,
    folder: string = '/',
    altText?: string,
    onProgress?: (event: UploadProgressEvent) => void,
    signal?: AbortSignal
  ): Promise<MediaItem> {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB standard chunk for Cloudflare R2 multipart upload (strict R2 min part size)

    // For files > 5MB, perform true physical sliced chunked upload
    if (file.size > CHUNK_SIZE) {
      return this.uploadMediaChunked(file, folder, altText, onProgress, signal, CHUNK_SIZE);
    }

    // For files <= 5MB, direct single-part upload
    return this.uploadMediaDirect(file, folder, altText, onProgress, signal);
  },

  async uploadMediaDirect(
    file: File,
    folder: string = '/',
    altText?: string,
    onProgress?: (event: UploadProgressEvent) => void,
    signal?: AbortSignal
  ): Promise<MediaItem> {
    await apiClient.ensureCsrfToken();
    let csrfToken = '';
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
      if (match && match[1]) csrfToken = match[1];
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('Upload cancelled'));
        });
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      if (altText) formData.append('alt_text', altText);

      const startTime = Date.now();
      let lastSamples: { time: number; loaded: number }[] = [];

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          const now = Date.now();
          lastSamples.push({ time: now, loaded: e.loaded });
          lastSamples = lastSamples.filter(s => now - s.time <= 1500);

          let currentSpeed = 0;
          if (lastSamples.length >= 2) {
            const oldest = lastSamples[0];
            const newest = lastSamples[lastSamples.length - 1];
            const timeDiff = (newest.time - oldest.time) / 1000;
            const loadedDiff = newest.loaded - oldest.loaded;
            if (timeDiff > 0.2) {
              currentSpeed = loadedDiff / timeDiff;
            }
          }

          if (currentSpeed <= 0) {
            const totalElapsed = (now - startTime) / 1000;
            currentSpeed = totalElapsed > 0.2 ? e.loaded / totalElapsed : 0;
          }

          const remainingBytes = Math.max(0, e.total - e.loaded);
          const remainingSec = currentSpeed > 0 ? Math.ceil(remainingBytes / currentSpeed) : 0;
          const percentage = Math.min(99, Math.round((e.loaded / e.total) * 100));

          if (onProgress) {
            onProgress({
              loaded: e.loaded,
              total: e.total,
              percentage,
              speedBytesPerSec: currentSpeed,
              estimatedRemainingSec: remainingSec,
            });
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText);
            if (onProgress) {
              onProgress({
                loaded: file.size,
                total: file.size,
                percentage: 100,
                speedBytesPerSec: 0,
                estimatedRemainingSec: 0,
              });
            }
            resolve(json.data);
          } catch {
            reject(new Error('Invalid response received from server'));
          }
        } else {
          try {
            const json = JSON.parse(xhr.responseText);
            reject(new Error(json.message || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network connection error during upload'));
      };

      const endpoint = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787/api'}/media`;
      xhr.open('POST', endpoint);
      xhr.withCredentials = true;
      if (csrfToken) {
        xhr.setRequestHeader('x-csrf-token', csrfToken);
      }
      xhr.send(formData);
    });
  },

  async uploadMediaChunked(
    file: File,
    folder: string = '/',
    altText?: string,
    onProgress?: (event: UploadProgressEvent) => void,
    signal?: AbortSignal,
    chunkSize: number = 5 * 1024 * 1024
  ): Promise<MediaItem> {
    await apiClient.ensureCsrfToken();
    let csrfToken = '';
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
      if (match && match[1]) csrfToken = match[1];
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787/api';

    // Step 1: Initialize multipart upload session
    const initRes = await fetch(`${apiBase}/media/chunked/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
      },
      credentials: 'include',
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        folder,
        altText,
      }),
      signal,
    });

    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to initialize chunked upload');
    }

    const { data: initData } = await initRes.json();
    const { uploadId, key } = initData;

    const totalParts = Math.ceil(file.size / chunkSize);
    const parts: { partNumber: number; etag: string }[] = [];
    const startTime = Date.now();
    let uploadedBytesTotal = 0;

    try {
      // Step 2: Upload each 5MB chunk sequentially with live acknowledgment
      for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
        if (signal?.aborted) throw new Error('Upload cancelled');

        const start = (partNumber - 1) * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        const chunkBlob = file.slice(start, end);
        const chunkFile = new File([chunkBlob], file.name, { type: file.type });

        const partEtag = await new Promise<string>((resolvePart, rejectPart) => {
          const xhr = new XMLHttpRequest();
          if (signal) {
            signal.addEventListener('abort', () => {
              xhr.abort();
              rejectPart(new Error('Upload cancelled'));
            });
          }

          const chunkForm = new FormData();
          chunkForm.append('key', key);
          chunkForm.append('uploadId', uploadId);
          chunkForm.append('partNumber', String(partNumber));
          chunkForm.append('mimeType', file.type);
          chunkForm.append('chunk', chunkFile);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && e.total > 0) {
              const currentTotalLoaded = uploadedBytesTotal + e.loaded;
              const now = Date.now();
              const elapsedSec = (now - startTime) / 1000;
              const currentSpeed = elapsedSec > 0.2 ? currentTotalLoaded / elapsedSec : 0;
              const remainingBytes = Math.max(0, file.size - currentTotalLoaded);
              const remainingSec = currentSpeed > 0 ? Math.ceil(remainingBytes / currentSpeed) : 0;
              const percentage = Math.min(99, Math.round((currentTotalLoaded / file.size) * 100));

              if (onProgress) {
                onProgress({
                  loaded: currentTotalLoaded,
                  total: file.size,
                  percentage,
                  speedBytesPerSec: currentSpeed,
                  estimatedRemainingSec: remainingSec,
                });
              }
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const json = JSON.parse(xhr.responseText);
                uploadedBytesTotal += (end - start);
                resolvePart(json.data.etag);
              } catch {
                rejectPart(new Error('Invalid response from chunk upload'));
              }
            } else {
              try {
                const json = JSON.parse(xhr.responseText);
                rejectPart(new Error(json.message || `Chunk ${partNumber} failed`));
              } catch {
                rejectPart(new Error(`Chunk ${partNumber} failed with status ${xhr.status}`));
              }
            }
          };

          xhr.onerror = () => rejectPart(new Error(`Network error during chunk ${partNumber}`));

          xhr.open('POST', `${apiBase}/media/chunked/part`);
          xhr.withCredentials = true;
          if (csrfToken) xhr.setRequestHeader('x-csrf-token', csrfToken);
          xhr.send(chunkForm);
        });

        parts.push({ partNumber, etag: partEtag });
      }

      // Step 3: Complete and save multipart upload record
      const completeRes = await fetch(`${apiBase}/media/chunked/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          key,
          uploadId,
          parts,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          folder,
          altText,
        }),
      });

      if (!completeRes.ok) {
        const err = await completeRes.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to finalize chunked upload');
      }

      const { data: completeData } = await completeRes.json();
      if (onProgress) {
        onProgress({
          loaded: file.size,
          total: file.size,
          percentage: 100,
          speedBytesPerSec: 0,
          estimatedRemainingSec: 0,
        });
      }

      return completeData;
    } catch (err) {
      void fetch(`${apiBase}/media/chunked/abort`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ key, uploadId }),
      }).catch(() => {});
      throw err;
    }
  },

  async updateMedia(id: string, data: { file_name?: string; alt_text?: string | null; folder?: string }): Promise<void> {
    await apiClient.patch(`/media/${id}`, data);
  },

  async deleteMedia(id: string): Promise<void> {
    await apiClient.delete(`/media/${id}`);
  }
};
