import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { ServiceService, type ServiceData, type PaginatedService } from '../services/service.service';
import { toast } from 'sonner';
import { ApiError } from '../api/client';
import { getErrorMessage, getSuccessMessage, extractApiErrors } from '../utils/error';
import { useTranslation } from '../i18n/LanguageContext';
import { useAuthStore } from '../stores/auth.store';
import { useServiceCategoryList, useDeleteServiceCategory } from './useServiceCategories';
import { type ServiceCategory } from '../services/service-category.service';
import { createServiceSchema, updateServiceSchema } from '../validations/service.schema';
import { extractZodErrors } from '../validations/common.schema';
import { SearchService } from '../services/search.service';

/* ─── Query Keys ──────────────────────────────────────────── */
export const serviceKeys = {
  all: ['services'] as const,
  list: (params?: { search?: string; category_id?: string; page?: number; limit?: number; status?: string }) =>
    [...serviceKeys.all, 'list', params] as const,
  detail: (id: string) => [...serviceKeys.all, 'detail', id] as const,
};

/* ─── Hooks ───────────────────────────────────────────────── */

/** Fetch paginated service list */
export function useServiceList(params?: { search?: string; category_id?: string; page?: number; limit?: number; status?: string }) {
  return useQuery<PaginatedService, ApiError>({
    queryKey: serviceKeys.list(params),
    queryFn: () => ServiceService.getAll(params),
  });
}

export function useInfiniteServiceList(params?: { search?: string; category_id?: string; limit?: number; status?: string }) {
  const limit = params?.limit || 20;
  return useInfiniteQuery<PaginatedService, Error>({
    queryKey: [...serviceKeys.all, 'infinite-list', { ...params, limit }],
    queryFn: ({ pageParam = 1 }) => ServiceService.getAll({ ...params, page: pageParam as number, limit }),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: Partial<Omit<ServiceData, 'id' | 'created_at' | 'updated_at'>>) =>
      ServiceService.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceKeys.all });
      toast.success(getSuccessMessage({ slug: 'SERVICE_CREATED' }, t as any, 'services'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'services'));
    },
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<ServiceData, 'id' | 'created_at' | 'updated_at'>> }) =>
      ServiceService.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceKeys.all });
      toast.success(getSuccessMessage({ slug: 'SERVICE_UPDATED' }, t as any, 'services'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'services'));
    },
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => ServiceService.delete(id),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: serviceKeys.all });
      toast.success(getSuccessMessage({ slug: 'SERVICE_DELETED' }, t as any, 'services'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'services'));
    },
  });
}

export interface UnifiedItem {
  id: string;
  title: string;
  slug: string;
  sort_order?: number;
  is_active: boolean | number;
  created_at?: string;
  type: "service" | "category";
  raw: ServiceCategory | ServiceData;
}

export function useServicesPageState() {
  const { t, locale } = useTranslation();
  const dict = t.services;
  const isRtl = locale === "ar";
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === "Admin";

  // ─── Local UI State ───────────────────────────────────────────
  const [searchInputValue, setSearchInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");
  const [activeTab, setActiveTab] = useState<"services" | "categories">("services");
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
  const { data: categoryData, isLoading: isServiceCategoryLoading } = useServiceCategoryList({ page: currentPage, limit: itemsPerPage, search: searchQuery, status: statusFilter });
  const { data: serviceData, isLoading: isServiceLoading } = useServiceList({ page: currentPage, limit: itemsPerPage, search: searchQuery, status: statusFilter, category_id: "null" });
  const deleteServiceCategoryMutation = useDeleteServiceCategory();
  const deleteServiceMutation = useDeleteService();

  const isLoading = activeTab === "categories" ? isServiceCategoryLoading : isServiceLoading;

  const itemList: UnifiedItem[] = useMemo(() => {
    if (activeTab === "categories") {
      return (categoryData?.categories ?? []).map(c => ({
        id: c.id,
        title: c.name,
        slug: c.slug,
        sort_order: c.sort_order ?? 0,
        is_active: c.is_active,
        created_at: c.created_at,
        type: "category" as const,
        raw: c
      }));
    }
    return (serviceData?.services ?? []).map(s => ({
      id: s.id,
      title: s.name,
      slug: s.slug,
      sort_order: s.sort_order ?? 0,
      is_active: s.is_active,
      created_at: s.created_at,
      type: "service" as const,
      raw: s
    }));
  }, [activeTab, categoryData, serviceData]);

  const totalPages = useMemo(() => {
    if (activeTab === "categories") return categoryData?.pagination?.totalPages || 1;
    return serviceData?.pagination?.totalPages || 1;
  }, [activeTab, categoryData, serviceData]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<UnifiedItem | null>(null);
  const [isServiceCategoryModalOpen, setIsServiceCategoryModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  
  const [editingServiceCategory, setEditingServiceCategory] = useState<ServiceCategory | null>(null);
  const [editingService, setEditingService] = useState<ServiceData | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [itemToDuplicate, setItemToDuplicate] = useState<ServiceData | null>(null);

  // ─── Handlers ─────────────────────────────────────────────────
  const openEditModal = useCallback((item: UnifiedItem) => {
    if (item.type === "category") {
      setEditingServiceCategory(item.raw as ServiceCategory);
      setIsServiceCategoryModalOpen(true);
    } else {
      setEditingService(item.raw as ServiceData);
      setIsServiceModalOpen(true);
    }
  }, []);

  const openDeleteModal = useCallback((item: UnifiedItem) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  }, []);

  const openDuplicateModal = useCallback((item: UnifiedItem) => {
    if (item.type === "service") {
      setItemToDuplicate(item.raw as ServiceData);
      setIsDuplicateModalOpen(true);
    }
  }, []);

  const confirmDelete = useCallback(() => {
    if (!itemToDelete) return;
    if (itemToDelete.type === "category") {
      deleteServiceCategoryMutation.mutate(itemToDelete.id);
    } else {
      deleteServiceMutation.mutate(itemToDelete.id);
    }
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  }, [itemToDelete, deleteServiceCategoryMutation, deleteServiceMutation]);

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
    activeTab, setActiveTab,
    currentPage, setCurrentPage,
    itemsPerPage,
    isLoading, itemList, totalPages,
    isMobile,
    isDeleteModalOpen, setIsDeleteModalOpen,
    itemToDelete, setItemToDelete,
    isServiceCategoryModalOpen, setIsServiceCategoryModalOpen,
    isServiceModalOpen, setIsServiceModalOpen,
    editingServiceCategory, setEditingServiceCategory,
    editingService, setEditingService,
    isDuplicateModalOpen, setIsDuplicateModalOpen,
    itemToDuplicate, setItemToDuplicate,
    openEditModal, openDeleteModal, openDuplicateModal, confirmDelete,
    handleSearchChange, handleFilterChange, formatDate, filterTabs,
    deleteServiceCategoryMutation, deleteServiceMutation
  };
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'text-description' | 'image' | 'video' | 'video-youtube' | 'icon' | 'datetime' | 'url' | 'list';
  value?: string | string[];
}

export function useServiceFormDialogState({
  open,
  onOpenChange,
  service,
  initialCategoryId
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceData | null;
  initialCategoryId?: string;
}) {
  const { t, locale } = useTranslation();
  const dict = t.services;
  const isEditing = !!service?.id;

  const createMutation = useCreateService();
  const updateMutation = useUpdateService();

  // Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [sortOrder, setSortOrder] = useState<number | "">("");
  const [isActive, setIsActive] = useState(true);

  // Validation Error State
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Custom Fields Schema State
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);

  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState("");

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevServiceId, setPrevServiceId] = useState(service?.id);

  // SEO State
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [isIndexable, setIsIndexable] = useState(true);
  const [isOgImagePickerOpen, setIsOgImagePickerOpen] = useState(false);
  const [metaTitleEdited, setMetaTitleEdited] = useState(!!service);
  const [metaDescEdited, setMetaDescEdited] = useState(!!service);

  useEffect(() => {
    if (open !== prevOpen || service?.id !== prevServiceId) {
      setPrevOpen(open);
      setPrevServiceId(service?.id);
      if (open) {
        if (service) {
          setTitle(service.name || "");
          setSlug(service.slug || "");
          setSlugEdited(true);
          setCategoryId(service.category_id || initialCategoryId || "");
          setSortOrder(service.sort_order ?? "");
          setIsActive(service.is_active === 1);

          if (service.meta_data) {
            try {
              const parsed = (typeof service.meta_data === "string"
                ? JSON.parse(service.meta_data)
                : service.meta_data) as Record<string, unknown>[];
              setCustomFields(parsed.map(f => {
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
              }));
            } catch (e) {
              console.error(e);
              setCustomFields([]);
            }
          } else {
            setCustomFields([]);
          }

          let seoRaw = service.seo_data || {};
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
          setCategoryId(initialCategoryId || "");
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
        setErrors({});
      }
    }
  }, [open, service, prevOpen, prevServiceId, initialCategoryId]);

  // Real-time slug uniqueness check with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!slug || slug.length < 2) { setSlugError(""); return; }
      try {
        const available = await SearchService.checkSlug(slug, 'services', service?.id);
        setSlugError(available ? "" : dict.form.slugTaken);
      } catch { setSlugError(""); }
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, service?.id, dict.form.slugTaken]);

  const handleSubmit = async () => {
    if (slugError) return;
    setSaving(true);
    try {
      const payload = {
        name: title,
        slug,
        category_id: categoryId || undefined,
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

      const schema = isEditing ? updateServiceSchema : createServiceSchema;
      const result = schema.safeParse(payload);
      if (!result.success) {
        setErrors(extractZodErrors(result.error, t as any, 'services.errors'));
        toast.error(t.common.zod.fix_errors);
        setSaving(false);
        return;
      }
      setErrors({});
      
      if (isEditing && service?.id) {
        await updateMutation.mutateAsync({ id: service.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      
      onOpenChange(false);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.slug === 'VALIDATION_ERROR' && e.details && e.details.length > 0) {
        const apiErrors = extractApiErrors(e, t as any, 'services.errors');
        if (Object.keys(apiErrors).length > 0) {
          setErrors(apiErrors);
          return;
        }
      }
      if (!(e instanceof ApiError)) {
        console.error("Failed to save service:", e);
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
    categoryId, setCategoryId,
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

export function useDuplicateServiceDialogState({
  open,
  onOpenChange,
  sourceService,
  initialCategoryId
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceService: ServiceData | null;
  initialCategoryId?: string;
}) {
  const { t, locale } = useTranslation();
  const dict = t.services;

  const createMutation = useCreateService();

  // Form State — always starts empty
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [sortOrder, setSortOrder] = useState<number | "">("");
  const [isActive, setIsActive] = useState(true);

  // Validation Error State
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Custom fields cloned from source (structure only, values empty)
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);

  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState("");

  const [prevOpen, setPrevOpen] = useState(open);

  // SEO State — always empty for duplicates
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [isIndexable, setIsIndexable] = useState(true);
  const [isOgImagePickerOpen, setIsOgImagePickerOpen] = useState(false);
  const [metaTitleEdited, setMetaTitleEdited] = useState(false);
  const [metaDescEdited, setMetaDescEdited] = useState(false);

  useEffect(() => {
    if (open !== prevOpen) {
      setPrevOpen(open);
      if (open && sourceService) {
        setTitle("");
        setSlug("");
        setSlugEdited(false);
        setCategoryId(sourceService.category_id || initialCategoryId || "");
        setSortOrder(sourceService.sort_order ?? "");
        setIsActive(true);
        setErrors({});
        setMetaTitle("");
        setMetaDesc("");
        setOgImage("");
        setCanonicalUrl("");
        setIsIndexable(true);
        setMetaTitleEdited(false);
        setMetaDescEdited(false);

        // Clone field structure from source — keep name (label), type; reset value
        if (sourceService.meta_data) {
          try {
            const parsed = (typeof sourceService.meta_data === "string"
              ? JSON.parse(sourceService.meta_data)
              : sourceService.meta_data) as Record<string, unknown>[];
            setCustomFields(parsed.map(f => {
              const rawType = String(f.type || "text");
              const type = (rawType === 'text-info' ? 'text' : rawType === 'photo' ? 'image' : rawType === 'date_time' ? 'datetime' : rawType === 'link' ? 'url' : rawType) as CustomFieldDefinition["type"];
              return {
                id: crypto.randomUUID(),
                name: String(f.label || f.name || ""),
                type,
                value: type === "list" ? [] : "",
              };
            }));
          } catch {
            setCustomFields([]);
          }
        } else {
          setCustomFields([]);
        }
      }
    }
  }, [open, sourceService, prevOpen, initialCategoryId]);

  // Real-time slug uniqueness check with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!slug || slug.length < 2) { setSlugError(""); return; }
      try {
        const available = await SearchService.checkSlug(slug, 'services', undefined);
        setSlugError(available ? "" : dict.form.slugTaken);
      } catch { setSlugError(""); }
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, dict.form.slugTaken]);

  const handleSubmit = async () => {
    if (slugError) return;
    setSaving(true);
    try {
      const payload = {
        name: title,
        slug,
        category_id: categoryId || undefined,
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

      const result = createServiceSchema.safeParse(payload);
      if (!result.success) {
        setErrors(extractZodErrors(result.error, t as any, 'services.errors'));
        toast.error(t.common.zod.fix_errors);
        setSaving(false);
        return;
      }
      setErrors({});
      await createMutation.mutateAsync(payload);
      onOpenChange(false);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.slug === 'VALIDATION_ERROR' && e.details && e.details.length > 0) {
        const apiErrors = extractApiErrors(e, t as any, 'services.errors');
        if (Object.keys(apiErrors).length > 0) {
          setErrors(apiErrors);
          return;
        }
      }
      if (!(e instanceof ApiError)) {
        console.error("Failed to duplicate service:", e);
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
    title, setTitle,
    slug, setSlug,
    slugEdited, setSlugEdited,
    categoryId, setCategoryId,
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
