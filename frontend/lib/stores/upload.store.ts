import { create } from 'zustand';
import { MediaService } from '@/lib/services/media.service';

export interface FileUploadItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error' | 'cancelled';
  progress: number;
  loaded: number;
  total: number;
  speedBytesPerSec: number;
  estimatedRemainingSec: number;
  error?: string;
  abortController?: AbortController;
}

interface UploadStoreState {
  uploadQueue: FileUploadItem[];
  isQueueExpanded: boolean;
  isPaused: boolean;
  activeCount: number;

  setIsQueueExpanded: (expanded: boolean) => void;
  pauseUpload: () => void;
  resumeUpload: () => void;
  togglePause: () => void;
  enqueueFiles: (files: File[], onFileComplete?: () => void) => void;
  cancelUploadItem: (id: string) => void;
  clearUploadQueue: () => void;
}

const CONCURRENCY = 2;
let autoDismissTimer: ReturnType<typeof setTimeout> | null = null;
let savedOnFileComplete: (() => void) | undefined = undefined;

export const useUploadStore = create<UploadStoreState>((set, get) => {
  const scheduleAutoDismiss = () => {
    if (autoDismissTimer) {
      clearTimeout(autoDismissTimer);
      autoDismissTimer = null;
    }

    const { uploadQueue } = get();
    const hasActiveOrPending = uploadQueue.some(
      (i) => i.status === 'uploading' || i.status === 'pending' || i.status === 'paused'
    );

    if (uploadQueue.length > 0 && !hasActiveOrPending) {
      const allCompleted = uploadQueue.every((i) => i.status === 'completed');
      if (allCompleted) {
        autoDismissTimer = setTimeout(() => {
          get().clearUploadQueue();
        }, 3500);
      }
    }
  };

  const cancelAutoDismiss = () => {
    if (autoDismissTimer) {
      clearTimeout(autoDismissTimer);
      autoDismissTimer = null;
    }
  };

  const processQueue = () => {
    const state = get();
    if (state.isPaused) return;
    if (state.activeCount >= CONCURRENCY) return;

    const nextItem = state.uploadQueue.find((item) => item.status === 'pending');
    if (!nextItem) {
      scheduleAutoDismiss();
      return;
    }

    cancelAutoDismiss();
    const abortController = new AbortController();

    set((s) => ({
      activeCount: s.activeCount + 1,
      uploadQueue: s.uploadQueue.map((item) =>
        item.id === nextItem.id ? { ...item, status: 'uploading', abortController } : item
      ),
    }));

    (async () => {
      try {
        await MediaService.uploadMediaWithProgress(
          nextItem.file,
          '/',
          undefined,
          (progressEvent) => {
            if (get().isPaused) return;
            set((s) => ({
              uploadQueue: s.uploadQueue.map((item) =>
                item.id === nextItem.id
                  ? {
                      ...item,
                      progress: progressEvent.percentage,
                      loaded: progressEvent.loaded,
                      total: progressEvent.total,
                      speedBytesPerSec: progressEvent.speedBytesPerSec,
                      estimatedRemainingSec: progressEvent.estimatedRemainingSec,
                    }
                  : item
              ),
            }));
          },
          abortController.signal
        );

        set((s) => ({
          uploadQueue: s.uploadQueue.map((item) =>
            item.id === nextItem.id
              ? {
                  ...item,
                  status: 'completed',
                  progress: 100,
                  loaded: item.size,
                  speedBytesPerSec: 0,
                  estimatedRemainingSec: 0,
                }
              : item
          ),
        }));

        if (savedOnFileComplete) {
          savedOnFileComplete();
        }
      } catch (err: any) {
        const isPaused = get().isPaused;
        const isAborted = abortController.signal.aborted || err?.message === 'Upload cancelled';

        if (isPaused) {
          set((s) => ({
            uploadQueue: s.uploadQueue.map((item) =>
              item.id === nextItem.id
                ? {
                    ...item,
                    status: 'paused',
                    speedBytesPerSec: 0,
                    estimatedRemainingSec: 0,
                  }
                : item
            ),
          }));
        } else if (isAborted) {
          set((s) => ({
            uploadQueue: s.uploadQueue.filter((item) => item.id !== nextItem.id),
          }));
        } else {
          set((s) => ({
            uploadQueue: s.uploadQueue.map((item) =>
              item.id === nextItem.id
                ? {
                    ...item,
                    status: 'error',
                    error: err?.message || 'Upload failed',
                    speedBytesPerSec: 0,
                    estimatedRemainingSec: 0,
                  }
                : item
            ),
          }));
        }
      } finally {
        set((s) => ({ activeCount: Math.max(0, s.activeCount - 1) }));
        if (!get().isPaused) {
          processQueue();
        }
        scheduleAutoDismiss();
      }
    })();
  };

  return {
    uploadQueue: [],
    isQueueExpanded: true,
    isPaused: false,
    activeCount: 0,

    setIsQueueExpanded: (expanded) => set({ isQueueExpanded: expanded }),

    pauseUpload: () => {
      set({ isPaused: true });
      get().uploadQueue.forEach((item) => {
        if (item.status === 'uploading') {
          item.abortController?.abort('paused');
        }
      });
      set((s) => ({
        uploadQueue: s.uploadQueue.map((item) =>
          item.status === 'uploading' ? { ...item, status: 'paused', speedBytesPerSec: 0 } : item
        ),
        activeCount: 0,
      }));
    },

    resumeUpload: () => {
      set((s) => ({
        isPaused: false,
        uploadQueue: s.uploadQueue.map((item) =>
          item.status === 'paused' ? { ...item, status: 'pending' } : item
        ),
      }));

      for (let i = 0; i < CONCURRENCY; i++) {
        processQueue();
      }
    },

    togglePause: () => {
      if (get().isPaused) {
        get().resumeUpload();
      } else {
        get().pauseUpload();
      }
    },

    enqueueFiles: (files, onFileComplete) => {
      if (!files || files.length === 0) return;
      cancelAutoDismiss();
      if (onFileComplete) {
        savedOnFileComplete = onFileComplete;
      }

      const newItems: FileUploadItem[] = files.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending',
        progress: 0,
        loaded: 0,
        total: file.size,
        speedBytesPerSec: 0,
        estimatedRemainingSec: 0,
      }));

      set((s) => ({
        uploadQueue: [...s.uploadQueue, ...newItems],
        isQueueExpanded: true,
        isPaused: false,
      }));

      for (let i = 0; i < CONCURRENCY; i++) {
        processQueue();
      }
    },

    cancelUploadItem: (id) => {
      const item = get().uploadQueue.find((i) => i.id === id);
      if (item?.status === 'uploading') {
        item.abortController?.abort();
      }
      set((s) => ({
        uploadQueue: s.uploadQueue.filter((i) => i.id !== id),
      }));
      scheduleAutoDismiss();
    },

    clearUploadQueue: () => {
      cancelAutoDismiss();
      get().uploadQueue.forEach((item) => {
        if (item.status === 'uploading') {
          item.abortController?.abort();
        }
      });
      set({ uploadQueue: [], activeCount: 0, isPaused: false });
    },
  };
});
