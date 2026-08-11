import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArticleService, type ArticleData, type PaginatedArticle } from '../services/article.service';
import { toast } from 'sonner';
import { ApiError } from '../api/client';
import { getErrorMessage, getSuccessMessage, extractApiErrors } from '../utils/error';
import { useTranslation } from '../i18n/LanguageContext';
import { useAuthStore } from '../stores/auth.store';
import { useArticleCategoryList, useDeleteArticleCategory } from './useArticleCategories';
import { ArticleCategoryService, type ArticleCategory } from '../services/article-category.service';
import { SearchService } from '../services/search.service';
import { useRouter, useParams } from 'next/navigation';
import { nanoid } from 'nanoid';
import { createArticleSchema, updateArticleSchema } from '../validations/article.schema';
import { extractZodErrors } from '../validations/common.schema';
import type { BlockType, ContentBlock } from '@/app/articles/BlockTypePickerPanel';

/* ─── Query Keys ──────────────────────────────────────────── */
export const articleKeys = {
  all: ['articles'] as const,
  list: (params?: { search?: string; category_id?: string; status?: string; page?: number; limit?: number }) =>
    [...articleKeys.all, 'list', params] as const,
  detail: (id: string) => [...articleKeys.all, 'detail', id] as const,
};

/* ─── Hooks ───────────────────────────────────────────────── */

/** Fetch paginated article list */
export function useArticleList(params?: { search?: string; category_id?: string; status?: string; page?: number; limit?: number }) {
  return useQuery<PaginatedArticle, ApiError>({
    queryKey: articleKeys.list(params),
    queryFn: () => ArticleService.getAll(params),
  });
}

/** Fetch publishers */
export function usePublisherList() {
  return useQuery<{ id: string; full_name: string; photo_url: string | null }[], ApiError>({
    queryKey: [...articleKeys.all, 'publishers'] as const,
    queryFn: () => ArticleService.getPublishers(),
  });
}

/** Create a new article */
export function useCreateArticle() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: Partial<Omit<ArticleData, 'id' | 'created_at' | 'updated_at'>>) =>
      ArticleService.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: articleKeys.all });
      toast.success(getSuccessMessage({ slug: 'ARTICLE_CREATED' }, t as any, 'articles'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'articles'));
    },
  });
}

/** Update an existing article */
export function useUpdateArticle() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<ArticleData, 'id' | 'created_at' | 'updated_at'>> }) =>
      ArticleService.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: articleKeys.all });
      toast.success(getSuccessMessage({ slug: 'ARTICLE_UPDATED' }, t as any, 'articles'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'articles'));
    },
  });
}

/** Delete an article */
export function useDeleteArticle() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => ArticleService.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: articleKeys.all });
      toast.success(getSuccessMessage({ slug: 'ARTICLE_DELETED' }, t as any, 'articles'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'articles'));
    },
  });
}

/* ─── State Hooks ─────────────────────────────────────────── */

export interface UnifiedItem {
  id: string;
  title: string;
  slug: string;
  is_active: boolean | number;
  created_at?: string;
  created_by?: string;
  created_by_name?: string;
  updated_at?: string;
  updated_by?: string;
  updated_by_name?: string;
  type: "article" | "category";
  sort_order?: number;
  category_id?: string | null;
  raw?: any;
}

export function useArticlesPageState() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const dict = t.articles;
  const isRtl = locale === "ar";
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === "Admin";

  const [searchInputValue, setSearchInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");
  const [activeTab, setActiveTab] = useState<"articles" | "categories">("articles");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInputValue);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInputValue]);

  const { data: articlesData, isLoading: articlesLoading, isFetching: articlesFetching } = useArticleList({
    page: currentPage,
    limit: itemsPerPage,
    search: searchQuery,
    category_id: "null",
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: categoriesData, isLoading: categoriesLoading, isFetching: categoriesFetching } = useArticleCategoryList({
    page: currentPage,
    limit: itemsPerPage,
    search: searchQuery,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  
  const deleteArticleMutation = useDeleteArticle();
  const deleteServiceCategoryMutation = useDeleteArticleCategory(); 

  const isLoading = activeTab === "articles" ? (articlesLoading || articlesFetching) : (categoriesLoading || categoriesFetching);

  const itemList: UnifiedItem[] = useMemo(() => {
    let items: UnifiedItem[] = [];
    if (activeTab === "articles" && articlesData) {
      items = articlesData.articles.map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        sort_order: a.sort_order ?? 0,
        is_active: a.is_active,
        created_at: a.created_at,
        created_by: a.created_by,
        created_by_name: a.created_by_name,
        updated_at: a.updated_at,
        updated_by: a.updated_by,
        updated_by_name: a.updated_by_name,
        type: "article",
        category_id: a.category_id,
        raw: a
      }));
    } else if (activeTab === "categories" && categoriesData) {
      items = categoriesData.categories.map(c => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        sort_order: c.sort_order ?? 0,
        is_active: c.is_active,
        created_at: c.created_at,
        created_by: c.created_by,
        created_by_name: c.created_by_name,
        updated_at: c.updated_at,
        updated_by: c.updated_by,
        updated_by_name: c.updated_by_name,
        type: "category",
        raw: c
      }));
    }
    return items;
  }, [activeTab, articlesData, categoriesData]);

  const totalPages = activeTab === "articles" 
    ? articlesData?.pagination.totalPages || 1 
    : categoriesData?.pagination.totalPages || 1;

  const [isMobile, setIsMobile] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<UnifiedItem | null>(null);

  const openEditModal = useCallback((item: UnifiedItem) => {
    if (item.type === "category") {
      setEditingCategory(item.raw);
      setIsCategoryModalOpen(true);
    } else {
      router.push(`/articles/edit/${item.id}`);
    }
  }, [router]);

  const openDuplicateModal = useCallback((item: UnifiedItem) => {
    if (item.type === "article") {
      router.push(`/articles/duplicate/${item.id}`);
    }
  }, [router]);

  const openDeleteModal = useCallback((item: UnifiedItem) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!itemToDelete) return;
    if (itemToDelete.type === "article") {
      deleteArticleMutation.mutate(itemToDelete.id);
    } else {
      deleteServiceCategoryMutation.mutate(itemToDelete.id);
    }
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  }, [itemToDelete, deleteArticleMutation, deleteServiceCategoryMutation]);

  const handleSearchChange = useCallback((val: string) => {
    const sanitized = val.replace(/<[^>]*>/g, "");
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
    { label: dict.search?.filterAll || "All", value: "all" as const },
    { label: dict.search?.filterActive || "Active", value: "active" as const },
    { label: dict.search?.filterInactive || "Inactive", value: "inactive" as const },
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
    isCategoryModalOpen, setIsCategoryModalOpen,
    editingCategory, setEditingCategory,
    openEditModal, openDeleteModal, openDuplicateModal, confirmDelete,
    handleSearchChange, handleFilterChange, formatDate, filterTabs,
    router
  };
}

export function useArticleCategoryPageState(categoryId: string) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const dict = t.articles;
  const isRtl = locale === "ar";
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === "Admin";

  const [searchInputValue, setSearchInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInputValue);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInputValue]);

  const { data: category, isLoading: isCategoryLoading } = useQuery({
    queryKey: ['article-categories', 'detail', categoryId],
    queryFn: () => ArticleCategoryService.getById(categoryId),
    enabled: !!categoryId && categoryId !== 'uncategorized',
  });

  const { data: articleData, isLoading: isArticleLoading } = useArticleList({
    page: currentPage,
    limit: itemsPerPage,
    search: searchQuery,
    category_id: categoryId === 'uncategorized' ? 'null' : categoryId,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const deleteArticleMutation = useDeleteArticle();

  const isLoading = isCategoryLoading || isArticleLoading;

  const itemList = useMemo(() => {
    return articleData?.articles || [];
  }, [articleData]);

  const totalPages = articleData?.pagination?.totalPages || 1;

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ArticleData | null>(null);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [isCategorySettingsOpen, setIsCategorySettingsOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArticleData | null>(null);

  const openEditModal = useCallback((item: ArticleData) => {
    router.push(`/articles/${categoryId}/edit/${item.id}`);
  }, [router, categoryId]);

  const openDeleteModal = useCallback((item: ArticleData) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  }, []);

  const openDuplicateModal = useCallback((item: ArticleData) => {
    router.push(`/articles/${categoryId}/duplicate/${item.id}`);
  }, [router, categoryId]);

  const confirmDelete = useCallback(() => {
    if (!itemToDelete) return;
    deleteArticleMutation.mutate(itemToDelete.id);
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  }, [itemToDelete, deleteArticleMutation]);

  const handleSearchChange = useCallback((val: string) => {
    const sanitized = val.replace(/<[^>]*>/g, "");
    setSearchInputValue(sanitized);
  }, []);

  const handleFilterChange = useCallback((val: "all" | "active" | "inactive") => {
    setStatusFilter(val);
    setCurrentPage(1);
  }, []);

  const formatDate = useCallback(
    (dateStr: string) =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
        year: "numeric", month: "short", day: "numeric",
      }).format(new Date(dateStr)),
    [locale]
  );

  const filterTabs = useMemo(() => [
    { label: dict.search?.filterAll || "All", value: "all" as const },
    { label: dict.search?.filterActive || "Active", value: "active" as const },
    { label: dict.search?.filterInactive || "Inactive", value: "inactive" as const },
  ], [dict.search]);

  return {
    t, locale, dict, isRtl, currentUser, isAdmin,
    searchInputValue, setSearchInputValue,
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    viewMode, setViewMode,
    currentPage, setCurrentPage,
    itemsPerPage,
    category, isLoading, itemList, totalPages,
    isMobile,
    isDeleteModalOpen, setIsDeleteModalOpen,
    itemToDelete, setItemToDelete,
    isArticleModalOpen, setIsArticleModalOpen,
    isCategorySettingsOpen, setIsCategorySettingsOpen,
    editingArticle, setEditingArticle,
    openEditModal, openDeleteModal, openDuplicateModal, confirmDelete,
    handleSearchChange, handleFilterChange, formatDate, filterTabs,
    router, categoryId
  };
}

export function useCategoryArticleFormDialogState({
  open,
  onOpenChange,
  article,
  categoryId
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: ArticleData | null;
  categoryId: string;
}) {
  const { t, locale } = useTranslation();
  const dict = t.articles;
  const isRtl = locale === "ar";
  const router = useRouter();
  const isEditing = !!article?.id;

  const createMutation = useCreateArticle();
  const updateMutation = useUpdateArticle();
  const currentUser = useAuthStore((s) => s.user);

  const [title, setTitle] = useState(article?.title || "");
  const [slug, setSlug] = useState(article?.slug || "");
  const [slugEdited, setSlugEdited] = useState(isEditing);
  const [slugError, setSlugError] = useState("");
  const [excerpt, setExcerpt] = useState(article?.excerpt || "");
  const [isActive, setIsActive] = useState((article?.is_active ?? 1) === 1 || article?.is_active === true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevArticleId, setPrevArticleId] = useState(article?.id);

  if (open !== prevOpen || article?.id !== prevArticleId) {
    setPrevOpen(open);
    setPrevArticleId(article?.id);
    if (open) {
      setTitle(article?.title || "");
      setSlug(article?.slug || "");
      setSlugEdited(!!article?.id);
      setExcerpt(article?.excerpt || "");
      setIsActive((article?.is_active ?? 1) === 1 || article?.is_active === true);
      setSlugError("");
      setErrors({});
    }
  }

  const [slugTimer, setSlugTimer] = useState<NodeJS.Timeout | null>(null);
  const handleSlugChange = (val: string) => {
    setSlug(val);
    setSlugEdited(true);
    if (slugTimer) clearTimeout(slugTimer);
    const timer = setTimeout(async () => {
      if (!val || val.length < 2) { setSlugError(""); return; }
      try {
        const available = await SearchService.checkSlug(val, "articles", article?.id as string | undefined);
        setSlugError(available ? "" : dict.form?.slugTaken || "Slug is already taken");
      } catch { setSlugError(""); }
    }, 400);
    setSlugTimer(timer);
  };

  function generateSlug(input: string): string {
    return input
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u064B-\u065F]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\u0621-\u064A\-]/gi, "")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  }

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugEdited && !isEditing) {
      const autoSlug = generateSlug(val);
      setSlug(autoSlug);
      if (slugTimer) clearTimeout(slugTimer);
      const timer = setTimeout(async () => {
        if (!autoSlug || autoSlug.length < 2) { setSlugError(""); return; }
        try {
          const available = await SearchService.checkSlug(autoSlug, "articles");
          setSlugError(available ? "" : dict.form?.slugTaken || "Slug is already taken");
        } catch { setSlugError(""); }
      }, 400);
      setSlugTimer(timer);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slugError) return;
    setErrors({});
    setSaving(true);
    
    const payload: any = {
      title,
      slug,
      excerpt,
      is_active: isActive ? 1 : 0,
      category_id: categoryId,
    };

    if (!isEditing && currentUser) {
      payload.created_by = currentUser.id;
    }

    try {
      if (isEditing && article) {
        await updateMutation.mutateAsync({ id: article.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      const apiErrs = extractApiErrors(err as any, t as any, 'articles');
      if (Object.keys(apiErrs).length > 0) setErrors(apiErrs);
    } finally {
      setSaving(false);
    }
  };

  return {
    t, locale, dict, isRtl, isEditing,
    title, handleTitleChange,
    slug, handleSlugChange, slugError,
    excerpt, setExcerpt,
    isActive, setIsActive,
    saving, errors,
    handleSubmit
  };
}

export function useDuplicateCategoryArticleDialogState({
  open,
  onOpenChange,
  sourceArticle,
  categoryId
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceArticle: ArticleData | null;
  categoryId: string;
}) {
  const { t, locale } = useTranslation();
  const dict = t.articles;
  const isRtl = locale === "ar";
  
  const createMutation = useCreateArticle();
  const currentUser = useAuthStore((s) => s.user);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [customFields, setCustomFields] = useState<any[]>([]);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<any | null>(null);

  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState("");

  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [isIndexable, setIsIndexable] = useState(true);
  const [isOgImagePickerOpen, setIsOgImagePickerOpen] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && sourceArticle) {
      setTitle("");
      setSlug("");
      setSlugEdited(false);
      setExcerpt("");
      setIsActive(true);
      setMetaTitle(""); setMetaDesc("");
      setOgImage(""); setCanonicalUrl(""); setIsIndexable(true);

      if (sourceArticle.meta_data) {
        try {
          const parsed = (typeof sourceArticle.meta_data === "string"
            ? JSON.parse(sourceArticle.meta_data)
            : sourceArticle.meta_data) as Record<string, unknown>[];
          setCustomFields(parsed.map(f => {
            const rawType = String(f.type || "text");
            const type = (rawType === 'text-info' ? 'text' : rawType === 'photo' ? 'image' : rawType === 'date_time' ? 'datetime' : rawType === 'link' ? 'url' : rawType);
            return {
              id: crypto.randomUUID(),
              name: String(f.label || f.name || ""),
              type,
              value: type === "list" ? [] : "",
            };
          }));
        } catch (e) { console.error("Failed to parse source blocks", e); }
      } else {
        setCustomFields([]);
      }
      setErrors({});
      setSlugError("");
    }
  }

  const [slugTimer, setSlugTimer] = useState<NodeJS.Timeout | null>(null);
  const handleSlugChange = (val: string) => {
    setSlug(val);
    setSlugEdited(true);
    if (slugTimer) clearTimeout(slugTimer);
    const timer = setTimeout(async () => {
      if (!val || val.length < 2) { setSlugError(""); return; }
      try {
        const available = await SearchService.checkSlug(val, "articles");
        setSlugError(available ? "" : dict.form?.slugTaken || "Slug is already taken");
      } catch { setSlugError(""); }
    }, 400);
    setSlugTimer(timer);
  };

  function generateSlug(input: string): string {
    return input
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u064B-\u065F]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\u0621-\u064A\-]/gi, "")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  }

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugEdited) {
      const autoSlug = generateSlug(val);
      setSlug(autoSlug);
      if (slugTimer) clearTimeout(slugTimer);
      const timer = setTimeout(async () => {
        if (!autoSlug || autoSlug.length < 2) { setSlugError(""); return; }
        try {
          const available = await SearchService.checkSlug(autoSlug, "articles");
          setSlugError(available ? "" : dict.form?.slugTaken || "Slug is already taken");
        } catch { setSlugError(""); }
      }, 400);
      setSlugTimer(timer);
    }
  };

  const mapCustomFieldsToApi = (fields: any[]) => {
    return fields.map(f => {
      const base = {
        id: f.id || crypto.randomUUID(),
        key: f.name,
        name: f.name,
        type: f.type === 'text' ? 'text-info' : 
              f.type === 'image' ? 'photo' : 
              f.type === 'datetime' ? 'date_time' : 
              f.type === 'url' ? 'link' : f.type,
      };
      let dataObj: Record<string, any> = {};
      if (f.type === 'text' || f.type === 'text-description') dataObj.text = f.value;
      else if (f.type === 'image' || f.type === 'video' || f.type === 'video-youtube' || f.type === 'url') dataObj.url = f.value;
      else if (f.type === 'icon') dataObj.name = f.value;
      else if (f.type === 'datetime') dataObj.value = f.value;
      else if (f.type === 'list') dataObj.items = f.value;
      else dataObj.value = f.value;
      return { ...base, data: dataObj };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slugError) return;
    setErrors({});
    
    const seoMetadata = { title: metaTitle, description: metaDesc, ogImage, canonicalUrl, isIndexable };
    const payload: any = {
      title, slug, excerpt,
      is_active: isActive ? 1 : 0,
      category_id: categoryId,
      meta_data: mapCustomFieldsToApi(customFields),
      seo_data: seoMetadata
    };
    if (currentUser) payload.created_by = currentUser.id;

    setSaving(true);
    try {
      await createMutation.mutateAsync(payload);
      onOpenChange(false);
    } catch (err) {
      const apiErrs = extractApiErrors(err as any, t as any, 'articles');
      if (Object.keys(apiErrs).length > 0) setErrors(apiErrs);
    } finally {
      setSaving(false);
    }
  };

  const addCustomField = (field: any) => setCustomFields([...customFields, field]);
  const updateCustomField = (id: string, value: string | string[]) => setCustomFields(customFields.map(f => f.id === id ? { ...f, value } : f));
  const saveEditedField = (updatedField: any) => setCustomFields(customFields.map(f => f.id === updatedField.id ? updatedField : f));
  const removeCustomField = (id: string) => setCustomFields(customFields.filter(f => f.id !== id));

  return {
    dict, isRtl,
    title, handleTitleChange,
    slug, handleSlugChange, slugError,
    excerpt, setExcerpt,
    isActive, setIsActive,
    customFields, addCustomField, updateCustomField, saveEditedField, removeCustomField,
    isFieldModalOpen, setIsFieldModalOpen,
    isEditModalOpen, setIsEditModalOpen,
    editingField, setEditingField,
    isOgImagePickerOpen, setIsOgImagePickerOpen,
    metaTitle, setMetaTitle,
    metaDesc, setMetaDesc,
    ogImage, setOgImage,
    canonicalUrl, setCanonicalUrl,
    isIndexable, setIsIndexable,
    saving, handleSubmit, errors
  };
}

// --- Default empty data per block type ---
function getDefaultBlockData(type: BlockType): Record<string, unknown> {
  switch (type) {
    case "text-info":        return { text: "" };
    case "text-description": return { text: "" };
    case "photo":            return { url: "", alt: "" };
    case "video":            return { url: "" };
    case "video-youtube":    return { url: "" };
    case "date_time":        return { value: "" };
    case "link":             return { url: "", label: "" };
    case "list":             return { items: [] as string[] };
    case "icon":             return { name: "" };
  }
}

// --- Robust slug generation ---
function generateSlug(input: string): string {
  return input
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0621-\u064A\-]/gi, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

const AUTO_SAVE_KEY = "aura_article_draft";
const AUTO_SAVE_INTERVAL_MS = 60_000;

export function useArticleForm({
  article,
  categoryId
}: {
  article?: Record<string, unknown>;
  categoryId?: string;
}) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const dict = t.articles;
  const af = dict.articleForm;
  const isEditing = !!article;

  const createMutation = useCreateArticle();
  const updateMutation = useUpdateArticle();
  const currentUser = useAuthStore((s) => s.user);
  const { data: publishersData, isLoading: publishersLoading } = usePublisherList();

  const [isAuthorSelectOpen, setIsAuthorSelectOpen] = useState(false);
  const [authorSearchQuery, setAuthorSearchQuery] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState(String(article?.title ?? ""));
  const [slug, setSlug] = useState(String(article?.slug ?? ""));
  const [slugEdited, setSlugEdited] = useState(isEditing);
  const [slugError, setSlugError] = useState("");
  const [excerpt, setExcerpt] = useState(String(article?.excerpt ?? ""));
  const [previewImageUrl, setPreviewImageUrl] = useState(String(article?.preview_image_url ?? ""));
  const [sortOrder, setSortOrder] = useState(Number(article?.sort_order ?? 0));
  const [isActive, setIsActive] = useState((article?.is_active ?? 1) === 1);
  const [publishedAt, setPublishedAt] = useState(String(article?.published_at ?? ""));
  const [readingTime, setReadingTime] = useState(String(article?.reading_time_minutes ?? ""));
  const [authorId, setAuthorId] = useState(String(article?.author_id ?? currentUser?.id ?? ""));

  const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
    if (article?.meta_data) {
      try {
        const raw = typeof article.meta_data === "string"
          ? JSON.parse(article.meta_data)
          : article.meta_data;
        if (Array.isArray(raw)) {
          return raw.map((b: Record<string, unknown>) => ({
            id: String(b.id || nanoid()),
            type: String(b.type || "text-info") as BlockType,
            label: String(b.label || ""),
            data: (b.data as Record<string, unknown>) ?? getDefaultBlockData(String(b.type || "text-info") as BlockType),
          }));
        }
      } catch { /* corrupt data */ }
    }
    return [];
  });

  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [isOgImagePickerOpen, setIsOgImagePickerOpen] = useState(false);

  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [isIndexable, setIsIndexable] = useState(true);
  const [isSeoOpen, setIsSeoOpen] = useState(false);
  const [metaTitleEdited, setMetaTitleEdited] = useState(isEditing);
  const [metaDescEdited, setMetaDescEdited] = useState(isEditing);

  // Hydrate core fields when article arrives
  useEffect(() => {
    const dataToHydrate = article;
    if (dataToHydrate) {
      setTitle(String(dataToHydrate.title ?? ""));
      setSlug(String(dataToHydrate.slug ?? ""));
      setExcerpt(String(dataToHydrate.excerpt ?? ""));
      setPreviewImageUrl(String(dataToHydrate.preview_image_url ?? ""));
      setSortOrder(Number(dataToHydrate.sort_order ?? 0));
      setIsActive((dataToHydrate.is_active ?? 1) === 1);
      setPublishedAt(String(dataToHydrate.published_at ?? ""));
      setReadingTime(String(dataToHydrate.reading_time_minutes ?? ""));
      setAuthorId(String(dataToHydrate.author_id ?? ""));
      
      if (dataToHydrate.meta_data) {
        try {
          const raw = typeof dataToHydrate.meta_data === "string"
            ? JSON.parse(dataToHydrate.meta_data)
            : dataToHydrate.meta_data;
          if (Array.isArray(raw)) {
            setBlocks(raw.map((b: Record<string, unknown>) => ({
              id: String(nanoid()),
              type: String(b.type || "text-info") as BlockType,
              label: String(b.label || ""),
              data: ((b.data as Record<string, unknown>) ?? getDefaultBlockData(String(b.type || "text-info") as BlockType)),
            })));
          }
        } catch { /* ignore */ }
      }
    }
  }, [article, isEditing, currentUser]);

  useEffect(() => {
    if (!isEditing && currentUser && !authorId) {
      setAuthorId(currentUser.id);
    }
  }, [currentUser, isEditing, authorId]);

  // Hydrate SEO
  useEffect(() => {
    const dataToHydrate = article;
    if (!dataToHydrate?.seo_data) return;
    const seo = (typeof dataToHydrate.seo_data === "string"
      ? JSON.parse(dataToHydrate.seo_data)
      : dataToHydrate.seo_data) as Record<string, unknown>;
    
    setMetaTitleEdited(!!seo.meta_title);
    setMetaDescEdited(!!seo.meta_description);
    
    setMetaTitle(String(seo.meta_title ?? ""));
    setMetaDesc(String(seo.meta_description ?? ""));
    setOgImage(String(seo.og_image ?? ""));
    setCanonicalUrl(String(seo.canonical_url ?? ""));
    setIsIndexable(Boolean(seo.is_indexable ?? true));
  }, [article, isEditing]);

  const selectedAuthor = publishersData?.find((p) => p.id === authorId);
  const selectedAuthorName = selectedAuthor?.full_name || (authorId === currentUser?.id ? currentUser?.full_name : authorId);
  const selectedAuthorPhoto = selectedAuthor?.photo_url || (authorId === currentUser?.id ? currentUser?.photo_url : null);

  const filteredPublishers = publishersData?.filter((pub) =>
    pub.full_name.toLowerCase().includes(authorSearchQuery.toLowerCase())
  );

  const isDirtyRef = useRef(false);
  useEffect(() => { isDirtyRef.current = true; }, [
    title, slug, excerpt, previewImageUrl, blocks,
    metaTitle, metaDesc, ogImage,
  ]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = af.unsavedChanges;
      return af.unsavedChanges;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [af.unsavedChanges]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isDirtyRef.current) return;
      const draft = { title, slug, excerpt, previewImageUrl, blocks, metaTitle, metaDesc, ogImage, sortOrder, isActive };
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(draft));
      toast.info(af.autoSaved, { duration: 2000, id: "auto-save" });
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [title, slug, excerpt, previewImageUrl, blocks, metaTitle, metaDesc, ogImage, sortOrder, isActive, af.autoSaved]);

  const [draftAvailable, setDraftAvailable] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (isEditing) return;
    try {
      const saved = localStorage.getItem(AUTO_SAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.title || parsed.blocks?.length)) {
          setDraftAvailable(parsed);
        }
      }
    } catch { /* ignore */ }
  }, [isEditing]);

  const handleRestoreDraft = useCallback(() => {
    if (!draftAvailable) return;
    if (draftAvailable.title) setTitle(draftAvailable.title);
    if (draftAvailable.slug) { setSlug(draftAvailable.slug); setSlugEdited(true); }
    if (draftAvailable.excerpt) setExcerpt(draftAvailable.excerpt);
    if (draftAvailable.previewImageUrl) setPreviewImageUrl(draftAvailable.previewImageUrl);
    if (draftAvailable.blocks) setBlocks(draftAvailable.blocks);
    if (draftAvailable.metaTitle) setMetaTitle(draftAvailable.metaTitle);
    if (draftAvailable.metaDesc) setMetaDesc(draftAvailable.metaDesc);
    if (draftAvailable.ogImage) setOgImage(draftAvailable.ogImage);
    if (draftAvailable.sortOrder !== undefined) setSortOrder(draftAvailable.sortOrder);
    if (draftAvailable.isActive !== undefined) setIsActive(draftAvailable.isActive);
    setDraftAvailable(null);
  }, [draftAvailable]);

  const handleDiscardDraft = useCallback(() => {
    localStorage.removeItem(AUTO_SAVE_KEY);
    setDraftAvailable(null);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!slug || slug.length < 2) { setSlugError(""); return; }
      try {
        const available = await SearchService.checkSlug(slug, 'articles', article?.id as string | undefined);
        setSlugError(available ? "" : dict.form.slugTaken || "Slug is already taken");
      } catch { setSlugError(""); }
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, article?.id, dict.form.slugTaken]);

  const handleAddBlock = useCallback((type: BlockType) => {
    const newId = nanoid();
    const newBlock: ContentBlock = {
      id: newId,
      type,
      label: "",
      data: getDefaultBlockData(type),
    };
    setBlocks((prev) => [...prev, newBlock]);
    setExpandedBlockId(newId);
  }, []);

  const handleDeleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setExpandedBlockId((cur) => (cur === id ? null : cur));
  }, []);

  const handleUpdateBlockLabel = useCallback((id: string, label: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, label } : b)));
  }, []);

  const handleUpdateBlockData = useCallback((id: string, key: string, value: unknown) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, data: { ...b.data, [key]: value } } : b))
    );
  }, []);

  const toggleBlock = useCallback((id: string) => {
    setExpandedBlockId((cur) => (cur === id ? null : id));
  }, []);

  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (slugError || !title.trim() || !slug.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title,
        slug,
        category_id: categoryId && categoryId !== "uncategorized" ? categoryId : null,
        excerpt: excerpt || null,
        preview_image_url: previewImageUrl || undefined,
        reading_time_minutes: readingTime ? Number(readingTime) : null,
        author_id: authorId || currentUser?.id || null,
        published_at: publishedAt || null,
        is_active: isActive ? 1 : 0,
        sort_order: sortOrder,
        meta_data: blocks.map((b) => ({
          id: b.id,
          type: b.type,
          label: b.label,
          data: b.data,
        })),
        seo_data: {
          meta_title: metaTitle,
          meta_description: metaDesc,
          og_image: ogImage || undefined,
          canonical_url: canonicalUrl || undefined,
          is_indexable: isIndexable,
        },
      };

      const schema = isEditing ? updateArticleSchema : createArticleSchema;
      const result = schema.safeParse(payload);
      if (!result.success) {
        setErrors(extractZodErrors(result.error, t as any, 'common.zod'));
        toast.error(t.common.zod.fix_errors);
        setSaving(false);
        return;
      }
      setErrors({});

      if (isEditing && article?.id) {
        await updateMutation.mutateAsync({ id: article.id as string, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      isDirtyRef.current = false;
      localStorage.removeItem(AUTO_SAVE_KEY);
      router.push(`/articles`);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.slug === 'VALIDATION_ERROR' && e.details && e.details.length > 0) {
        const apiErrors = extractApiErrors(e, t as any, 'common.errors');
        if (Object.keys(apiErrors).length > 0) {
          setErrors(apiErrors);
          return;
        }
      }
      if (!(e instanceof ApiError)) {
        console.error("Failed to save article:", e);
      }
    } finally {
      setSaving(false);
    }
  };

  return {
    t, locale, dict, af, isEditing,
    title, setTitle,
    slug, setSlug, slugEdited, setSlugEdited, slugError,
    excerpt, setExcerpt,
    previewImageUrl, setPreviewImageUrl,
    sortOrder, setSortOrder,
    isActive, setIsActive,
    publishedAt, setPublishedAt,
    readingTime, setReadingTime,
    authorId, setAuthorId,
    blocks, setBlocks,
    expandedBlockId, setExpandedBlockId,
    isPickerOpen, setIsPickerOpen,
    isMediaPickerOpen, setIsMediaPickerOpen,
    isOgImagePickerOpen, setIsOgImagePickerOpen,
    metaTitle, setMetaTitle,
    metaDesc, setMetaDesc,
    ogImage, setOgImage,
    canonicalUrl, setCanonicalUrl,
    isIndexable, setIsIndexable,
    isSeoOpen, setIsSeoOpen,
    metaTitleEdited, setMetaTitleEdited,
    metaDescEdited, setMetaDescEdited,
    isAuthorSelectOpen, setIsAuthorSelectOpen,
    authorSearchQuery, setAuthorSearchQuery,
    errors, saving,
    selectedAuthorName, selectedAuthorPhoto, filteredPublishers, publishersLoading,
    draftAvailable,
    handleRestoreDraft, handleDiscardDraft,
    handleAddBlock, handleDeleteBlock, handleUpdateBlockLabel, handleUpdateBlockData, toggleBlock,
    handleSubmit, generateSlug
  };
}

