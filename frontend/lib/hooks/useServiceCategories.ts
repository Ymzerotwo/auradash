import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { ServiceCategoryService, type ServiceCategory, type PaginatedServiceCategory } from '../services/service-category.service';
import { toast } from 'sonner';
import { ApiError } from '../api/client';
import { getErrorMessage, getSuccessMessage, extractApiErrors } from '../utils/error';
import { useTranslation } from '../i18n/LanguageContext';
import { useAuthStore } from '../stores/auth.store';
import { useServiceList, useDeleteService, type CustomFieldDefinition } from './useServices';
import { type ServiceData } from '../services/service.service';
import { createCategorySchema, updateCategorySchema } from '../validations/service-category.schema';
import { extractZodErrors } from '../validations/common.schema';
import { SearchService } from '../services/search.service';

/* ─── Query Keys ──────────────────────────────────────────── */
export const categoryKeys = {
  all: ['categories'] as const,
  list: (params?: { search?: string; page?: number; limit?: number; status?: string }) =>
    [...categoryKeys.all, 'list', params] as const,
  detail: (id: string) => [...categoryKeys.all, 'detail', id] as const,
};

/* ─── Hooks ───────────────────────────────────────────────── */

/** Fetch paginated category list */
export function useServiceCategoryList(params?: { search?: string; page?: number; limit?: number; status?: string }) {
  return useQuery<PaginatedServiceCategory, ApiError>({
    queryKey: categoryKeys.list(params),
    queryFn: () => ServiceCategoryService.getAll(params),
  });
}

export function useInfiniteServiceCategoryList(params?: { search?: string; limit?: number; status?: string }) {
  const limit = params?.limit || 20;
  return useInfiniteQuery<PaginatedServiceCategory, Error>({
    queryKey: [...categoryKeys.all, 'infinite-list', { ...params, limit }],
    queryFn: ({ pageParam = 1 }) => ServiceCategoryService.getAll({ ...params, page: pageParam as number, limit }),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}

export function useCreateServiceCategory() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: Partial<Omit<ServiceCategory, 'id' | 'created_at' | 'updated_at'>>) =>
      ServiceCategoryService.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: categoryKeys.all });
      toast.success(getSuccessMessage({ slug: 'CATEGORY_CREATED' }, t as any, 'categories'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'categories'));
    },
  });
}

export function useUpdateServiceCategory() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<ServiceCategory, 'id' | 'created_at' | 'updated_at'>> }) =>
      ServiceCategoryService.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: categoryKeys.all });
      toast.success(getSuccessMessage({ slug: 'CATEGORY_UPDATED' }, t as any, 'categories'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'categories'));
    },
  });
}

export function useDeleteServiceCategory() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => ServiceCategoryService.delete(id),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: categoryKeys.all });
      toast.success(getSuccessMessage({ slug: 'CATEGORY_DELETED' }, t as any, 'categories'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'categories'));
    },
  });
}

export function useCategoryDetailsPageState(categoryId: string) {
  const { t, locale } = useTranslation();
  const dict = t.categories;
  const isRtl = locale === "ar";
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === "Admin";

  // ─── Local UI State ───────────────────────────────────────────
  const [searchInputValue, setSearchInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 20;

  // Debounce search input changes by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInputValue);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInputValue]);

  // ─── React Query ───────────────────────────────────────────────
  const { data: category, isLoading: isCategoryLoading } = useQuery({
    queryKey: categoryKeys.detail(categoryId),
    queryFn: () => ServiceCategoryService.getById(categoryId),
  });

  const { data: serviceData, isLoading: isServiceLoading } = useServiceList({ 
    page: currentPage, 
    limit: itemsPerPage, 
    search: searchQuery,
    category_id: categoryId,
    status: statusFilter
  });
  
  const deleteServiceMutation = useDeleteService();

  const isLoading = isCategoryLoading || isServiceLoading;

  const itemList = useMemo(() => {
    return serviceData?.services || [];
  }, [serviceData]);

  const totalPages = serviceData?.pagination?.totalPages || 1;

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ServiceData | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isCategorySettingsOpen, setIsCategorySettingsOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceData | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [itemToDuplicate, setItemToDuplicate] = useState<ServiceData | null>(null);

  // ─── Handlers ─────────────────────────────────────────────────
  const openEditModal = useCallback((item: ServiceData) => {
    setEditingService(item);
    setIsServiceModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((item: ServiceData) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  }, []);

  const openDuplicateModal = useCallback((item: ServiceData) => {
    setItemToDuplicate(item);
    setIsDuplicateModalOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!itemToDelete) return;
    deleteServiceMutation.mutate(itemToDelete.id);
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  }, [itemToDelete, deleteServiceMutation]);

  const handleSearchChange = useCallback((val: string) => {
    const sanitized = val.replace(/<[^>]*>/g, ""); // Strip HTML/XSS tags
    setSearchInputValue(sanitized);
  }, []);

  const handleFilterChange = useCallback((val: "all" | "active" | "inactive") => {
    setStatusFilter(val);
    setCurrentPage(1);
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    }).format(new Date(dateStr));
  }, [locale]);

  const filterTabs = useMemo(() => [
    { label: dict.search.filterAll, value: "all" as const },
    { label: dict.search.filterActive, value: "active" as const },
    { label: dict.search.filterInactive, value: "inactive" as const },
  ], [dict.search]);

  return {
    t, locale, dict, isRtl, currentUser, isAdmin,
    searchInputValue, setSearchInputValue,
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    viewMode, setViewMode,
    currentPage, setCurrentPage,
    itemsPerPage,
    category, serviceData, deleteServiceMutation,
    isLoading, itemList, totalPages,
    isMobile,
    isDeleteModalOpen, setIsDeleteModalOpen,
    itemToDelete, setItemToDelete,
    isServiceModalOpen, setIsServiceModalOpen,
    isCategorySettingsOpen, setIsCategorySettingsOpen,
    editingService, setEditingService,
    isDuplicateModalOpen, setIsDuplicateModalOpen,
    itemToDuplicate, setItemToDuplicate,
    openEditModal, openDeleteModal, openDuplicateModal, confirmDelete,
    handleSearchChange, handleFilterChange, formatDate, filterTabs
  };
}

export function useServiceCategoryFormDialogState({
  open,
  onOpenChange,
  category
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: ServiceCategory | null;
}) {
  const { t, locale } = useTranslation();
  const dict = t.services;
  const isEditing = !!category;

  const createMutation = useCreateServiceCategory();
  const updateMutation = useUpdateServiceCategory();

  // Validation Error State
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [sortOrder, setSortOrder] = useState<number | "">("");
  const [isActive, setIsActive] = useState(true);

  // Custom Fields Schema State
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);

  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState("");

  // SEO State
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [isIndexable, setIsIndexable] = useState(true);
  const [metaTitleEdited, setMetaTitleEdited] = useState(!!category);
  const [metaDescEdited, setMetaDescEdited] = useState(!!category);
  const [isOgImagePickerOpen, setIsOgImagePickerOpen] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevServiceCategoryId, setPrevServiceCategoryId] = useState(category?.id);

  useEffect(() => {
    if (open !== prevOpen || category?.id !== prevServiceCategoryId) {
      setPrevOpen(open);
      setPrevServiceCategoryId(category?.id);
      if (open) {
        setErrors({});
        if (category) {
          setTitle(category.name || "");
          setSlug(category.slug || "");
          setSlugEdited(true);
          setSortOrder(category.sort_order ?? "");
          setIsActive(category.is_active === 1);
          
          const apiMetaData = (Array.isArray(category.meta_data) ? category.meta_data : []) as Record<string, unknown>[];
          const parsedFields = apiMetaData.map((f) => {
            const rawType = String(f.type || "text");
            const type = (rawType === 'text-info' ? 'text' : rawType === 'photo' ? 'image' : rawType === 'date_time' ? 'datetime' : rawType === 'link' ? 'url' : rawType) as CustomFieldDefinition["type"];
            let val: string | string[] = "";
            if (f.data && typeof f.data === 'object' && !Array.isArray(f.data)) {
              const d = f.data as Record<string, any>;
              if (type === 'text' || type === 'text-description') val = d.text ?? "";
              else if (type === 'image' || type === 'video' || type === 'video-youtube' || type === 'url') val = d.url ?? "";
              else if (type === 'icon') val = d.name ?? "";
              else if (type === 'datetime') val = d.value ?? "";
              else if (type === 'list') val = Array.isArray(d.items) ? d.items : [];
              else val = d.text ?? d.url ?? d.name ?? d.value ?? d.items ?? "";
            } else {
              val = f.value !== undefined ? (f.value as string | string[]) : (f.data !== undefined ? (f.data as string | string[]) : "");
            }
            return {
              id: String(f.id || ""),
              name: String(f.label || f.name || ""),
              type,
              value: val
            };
          }) as CustomFieldDefinition[];
          setCustomFields(parsedFields);

          let seoRaw = category.seo_data || {};
          if (typeof seoRaw === "string") {
            try { seoRaw = JSON.parse(seoRaw); } catch { seoRaw = {}; }
          }
          const seo = seoRaw as any;
          setMetaTitle(seo.meta_title || seo.metaTitle || "");
          setMetaDesc(seo.meta_description || seo.metaDesc || "");
          setOgImage(seo.og_image || seo.ogImage || "");
          setCanonicalUrl(seo.canonical_url || "");
          setIsIndexable(seo.is_indexable ?? true);
          setMetaTitleEdited(!!(seo.meta_title || seo.metaTitle));
          setMetaDescEdited(!!(seo.meta_description || seo.metaDesc));
        } else {
          setTitle("");
          setSlug("");
          setSlugEdited(false);
          setSortOrder("");
          setIsActive(true);
          setCustomFields([]);
          setMetaTitle("");
          setMetaDesc("");
          setOgImage("");
          setCanonicalUrl("");
          setIsIndexable(true);
          setMetaTitleEdited(false);
          setMetaDescEdited(false);
        }
      }
    }
  }, [open, category, prevOpen, prevServiceCategoryId]);

  // Real-time slug uniqueness check with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!slug || slug.length < 2) { setSlugError(""); return; }
      try {
        const available = await SearchService.checkSlug(slug, 'service-categories', category?.id);
        setSlugError(available ? "" : dict.form.slugTaken);
      } catch { setSlugError(""); }
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, category?.id, dict.form.slugTaken]);

  const handleSubmit = async () => {
    if (slugError) return;
    setSaving(true);
    try {
      const payload = {
        name: title,
        slug,
        sort_order: sortOrder === "" ? 0 : sortOrder,
        is_active: isActive,
        meta_data: customFields.map(f => {
          const t = f.type === 'text' ? 'text-info' : f.type === 'image' ? 'photo' : f.type === 'datetime' ? 'date_time' : f.type === 'url' ? 'link' : f.type;
          let d: any = {};
          const v = f.value ?? "";
          if (t === 'text-info' || t === 'text-description') d = { text: v };
          else if (t === 'icon') d = { name: v };
          else if (t === 'photo' || t === 'video' || t === 'video-youtube') d = { url: v };
          else if (t === 'date_time') d = { value: v };
          else if (t === 'link') d = { url: v, label: f.name };
          else if (t === 'list') d = { items: Array.isArray(v) ? v : [] };
          else d = { value: v };
          return { id: f.id, label: f.name, type: t, data: d };
        }),
        seo_data: {
          meta_title: metaTitle,
          meta_description: metaDesc,
          og_image: ogImage || undefined,
          canonical_url: canonicalUrl || undefined,
          is_indexable: isIndexable
        }
      };

      const schema = isEditing ? updateCategorySchema : createCategorySchema;
      const result = schema.safeParse(payload);
      if (!result.success) {
        setErrors(extractZodErrors(result.error, t as any, 'categories.errors'));
        toast.error(t.common.zod.fix_errors);
        setSaving(false);
        return;
      }
      setErrors({});
      
      if (isEditing && category?.id) {
        await updateMutation.mutateAsync({ id: category.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      
      onOpenChange(false);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.slug === 'VALIDATION_ERROR' && e.details && e.details.length > 0) {
        const apiErrors = extractApiErrors(e, t as any, 'categories.errors');
        if (Object.keys(apiErrors).length > 0) {
          setErrors(apiErrors);
          return;
        }
      }
      if (!(e instanceof ApiError)) {
        console.error("Failed to save category:", e);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustomField = useCallback((field: CustomFieldDefinition) => {
    setCustomFields((prev) => {
      const index = prev.findIndex(f => f.id === field.id);
      if (index >= 0) {
        const newFields = [...prev];
        newFields[index] = field;
        return newFields;
      }
      return [...prev, field];
    });
    if ((field.id === 'description' || field.name.toLowerCase() === 'description') && !metaDescEdited && typeof field.value === 'string') {
      setMetaDesc(field.value.substring(0, 155));
    }
  }, [metaDescEdited]);

  const handleRemoveCustomField = useCallback((id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return {
    isEditing,
    title, setTitle,
    slug, setSlug,
    slugEdited, setSlugEdited,
    sortOrder, setSortOrder,
    isActive, setIsActive,
    errors, setErrors,
    customFields, setCustomFields,
    isFieldModalOpen, setIsFieldModalOpen,
    isEditModalOpen, setIsEditModalOpen,
    editingField, setEditingField,
    saving, setSaving,
    slugError, setSlugError,
    metaTitle, setMetaTitle,
    metaDesc, setMetaDesc,
    ogImage, setOgImage,
    canonicalUrl, setCanonicalUrl,
    isIndexable, setIsIndexable,
    isOgImagePickerOpen, setIsOgImagePickerOpen,
    metaTitleEdited, setMetaTitleEdited,
    metaDescEdited, setMetaDescEdited,
    handleSubmit,
    handleSaveCustomField,
    handleRemoveCustomField,
  };
}
