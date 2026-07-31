import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MediaService, type PaginatedMedia, type MediaQueryParams, type MediaItem as ApiMediaItem } from '../services/media.service';
import { toast } from 'sonner';
import { ApiError, API_BASE_URL } from '../api/client';
import { getErrorMessage, getSuccessMessage } from '../utils/error';
import { useTranslation } from '../i18n/LanguageContext';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { updateMediaSchema } from "@/lib/validations/media.schema";
import { extractZodErrors } from "@/lib/validations/common.schema";
import type { Dictionary } from '../i18n/dictionaries';

export const mediaKeys = {
  all: ['media'] as const,
  list: (params?: MediaQueryParams) => [...mediaKeys.all, 'list', params] as const,
};

export function useMediaList(params?: MediaQueryParams) {
  return useQuery<PaginatedMedia, ApiError>({
    queryKey: mediaKeys.list(params),
    queryFn: () => MediaService.getAll(params || {}),
  });
}

export function useUploadMedia() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ file, folder, altText }: { file: File; folder?: string; altText?: string }) =>
      MediaService.uploadMedia(file, folder, altText),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success(getSuccessMessage({ slug: 'MEDIA_UPLOADED' }, t as Dictionary, 'media'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as Dictionary, 'media'));
    },
  });
}

export function useUpdateMedia() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { file_name?: string; alt_text?: string | null; folder?: string } }) =>
      MediaService.updateMedia(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success(getSuccessMessage({ slug: 'MEDIA_UPDATED' }, t as Dictionary, 'media'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as Dictionary, 'media'));
    },
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => MediaService.deleteMedia(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success(getSuccessMessage({ slug: 'MEDIA_DELETED' }, t as Dictionary, 'media'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as Dictionary, 'media'));
    },
  });
}

// ─── PAGE HOOK ─────────────────────────────────────────────────────────────

export function useMediaPageState() {
  const { t } = useTranslation();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");
  const [isMobile, setIsMobile] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const sanitized = searchQuery.replace(/<[^>]*>/g, "").trim();
      setDebouncedSearch(sanitized);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ApiMediaItem | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ApiMediaItem | null>(null);
  const [newFileName, setNewFileName] = useState("");

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const mime_type = typeFilter !== "all" ? (typeFilter === "image" ? "image/" : "video/") : undefined;
  
  const { data: paginatedData, isLoading } = useMediaList({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearch || undefined,
    mime_type
  });

  const uploadMutation = useUploadMedia();
  const updateMutation = useUpdateMedia();
  const deleteMutation = useDeleteMedia();

  const mediaList = paginatedData?.data || [];
  const totalPages = paginatedData?.pagination.totalPages || 1;

  const handleDownload = useCallback((mediaId: string, fileName: string) => {
    const downloadUrl = `${API_BASE_URL}/media/${mediaId}/download`;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const openEditModal = useCallback((item: ApiMediaItem) => {
    setItemToEdit(item);
    setNewFileName(item.file_name);
    setErrors({});
    setIsEditModalOpen(true);
  }, []);

  const saveEdit = useCallback(() => {
    if (itemToEdit) {
      const schema = updateMediaSchema;
      const result = schema.safeParse({ file_name: newFileName });
      if (!result.success) {
        setErrors(extractZodErrors(result.error, t as Dictionary, 'common.zod'));
        return;
      }
      setErrors({});
      updateMutation.mutate({ id: itemToEdit.id, data: { file_name: newFileName } });
    }
    setIsEditModalOpen(false);
    setItemToEdit(null);
  }, [itemToEdit, newFileName, updateMutation, t]);

  const openDeleteModal = useCallback((item: ApiMediaItem) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
    }
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  }, [itemToDelete, deleteMutation]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleFilterChange = (val: "all" | "image" | "video") => {
    setTypeFilter(val);
    setCurrentPage(1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const MAX_FILE_SIZE = 100 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t.common.upload.file_too_large);
        if (e.target) e.target.value = '';
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
      if (!allowedTypes.includes(file.type)) {
        toast.error(t.common.upload.photo_allowed_types);
        if (e.target) e.target.value = '';
        return;
      }

      uploadMutation.mutate({ file }, {
        onSuccess: () => {
          setIsUploadModalOpen(false);
        }
      });
    }
    if (e.target) e.target.value = '';
  };

  return {
    searchQuery, handleSearchChange,
    typeFilter, handleFilterChange,
    viewMode, setViewMode,
    isMobile,
    currentPage, setCurrentPage,
    isDeleteModalOpen, setIsDeleteModalOpen,
    isEditModalOpen, setIsEditModalOpen,
    isUploadModalOpen, setIsUploadModalOpen,
    newFileName, setNewFileName,
    errors,
    fileInputRef,
    isLoading, mediaList, totalPages,
    uploadMutation, updateMutation, deleteMutation,
    handleDownload, openEditModal, saveEdit, openDeleteModal, confirmDelete, handleFileChange,
    itemsPerPage
  };
}

// ─── PICKER HOOK ───────────────────────────────────────────────────────────

export interface MediaPickerItem {
  id: string;
  name: string;
  type: "image" | "video";
  url: string;
  createdAt?: string;
  size: string;
  altText?: string;
}

function getFileUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, "");
  return `${baseUrl}${url.startsWith("/") ? url : "/" + url}`;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (!+bytes) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function apiItemToPickerItem(item: ApiMediaItem): MediaPickerItem {
  const mediaType: "image" | "video" = item.mime_type.startsWith("video/") ? "video" : "image";
  return {
    id: item.id,
    name: item.file_name,
    type: mediaType,
    url: getFileUrl(item.file_url),
    createdAt: item.created_at,
    size: formatBytes(item.size_bytes),
    altText: item.alt_text ?? undefined,
  };
}

export function useMediaPickerState({ 
  type = "all", 
  folder, 
  onSelect, 
  onOpenChange 
}: { 
  type?: "image" | "video" | "all";
  folder?: string;
  onSelect: (media: MediaPickerItem) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">(type === "all" ? "all" : type);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<MediaPickerItem[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeMimeFilter = useMemo(() => {
    const activeType = type !== "all" ? type : typeFilter;
    if (activeType === "image") return "image/";
    if (activeType === "video") return "video/";
    return undefined;
  }, [type, typeFilter]);

  const { data: paginatedData, isLoading } = useMediaList({
    page: 1,
    limit: 50,
    search: debouncedSearch || undefined,
    mime_type: activeMimeFilter,
    folder: folder || undefined,
  });

  const uploadMutation = useUploadMedia();

  const mediaItems: MediaPickerItem[] = useMemo(() => {
    const apiItems = (paginatedData?.data || []).map(apiItemToPickerItem);
    const merged = [...uploadedMedia];
    for (const item of apiItems) {
      if (!merged.find(m => m.id === item.id)) {
        merged.push(item);
      }
    }
    return merged;
  }, [paginatedData, uploadedMedia]);

  const handleSearchChange = (val: string) => setSearchQuery(val);
  const handleFilterChange = (val: "all" | "image" | "video") => setTypeFilter(val);

  const handleSelectConfirm = () => {
    const selectedItem = mediaItems.find((m) => m.id === selectedId);
    if (selectedItem) {
      onSelect(selectedItem);
      onOpenChange(false);
    }
  };

  const handleUploadNewClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Maximum size is ${formatBytes(MAX_FILE_SIZE)}.`);
      if (e.target) e.target.value = "";
      return;
    }

    const allAllowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
    if (!allAllowed.includes(file.type)) {
      toast.error("Unsupported file format. Allowed: JPG, PNG, WEBP, GIF, MP4, WebM.");
      if (e.target) e.target.value = "";
      return;
    }

    uploadMutation.mutate(
      { file, folder },
      {
        onSuccess: (newMedia) => {
          const newItem = apiItemToPickerItem(newMedia);
          setUploadedMedia(prev => [newItem, ...prev]);
          setSelectedId(newItem.id);
        },
      }
    );

    if (e.target) e.target.value = "";
  };

  return {
    searchQuery, handleSearchChange,
    typeFilter, handleFilterChange,
    selectedId, setSelectedId,
    fileInputRef,
    isLoading, mediaItems,
    uploadMutation,
    handleSelectConfirm,
    handleUploadNewClick,
    handleFileChange,
    activeMimeFilter
  };
}

// ─── PREVIEW HOOKS ─────────────────────────────────────────────────────────

export function useVideoPreview() {
  const [isHovered, setIsHovered] = useState(false);
  return { isHovered, setIsHovered };
}

export function useGifPreview(url: string) {
  const [isHovered, setIsHovered] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const checkAndDraw = () => {
      if (canvasRef.current && imgRef.current) {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        canvas.width = img.naturalWidth || img.width || 300;
        canvas.height = img.naturalHeight || img.height || 200;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      }
    };

    if (imgLoaded) {
      checkAndDraw();
    } else if (imgRef.current?.complete) {
      setImgLoaded(true);
      checkAndDraw();
    }
  }, [imgLoaded, isHovered, url]);

  return {
    isHovered,
    setIsHovered,
    canvasRef,
    imgRef,
    setImgLoaded
  };
}
