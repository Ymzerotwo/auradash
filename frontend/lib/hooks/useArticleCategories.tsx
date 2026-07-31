import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArticleCategoryService, type ArticleCategory, type PaginatedArticleCategory } from '../services/article-category.service';
import { toast } from 'sonner';
import { ApiError } from '../api/client';
import { getErrorMessage, getSuccessMessage, extractApiErrors } from '../utils/error';
import { useTranslation } from '../i18n/LanguageContext';
import { SearchService } from '../services/search.service';
import { nanoid } from 'nanoid';
import { type CustomFieldDefinition } from '@/components/ui/CustomFieldModal';
import { createArticleCategorySchema, updateArticleCategorySchema } from '../validations/article-category.schema';
import { extractZodErrors } from '../validations/common.schema';

/* ─── Query Keys ──────────────────────────────────────────── */
export const articleCategoryKeys = {
  all: ['article-categories'] as const,
  list: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    [...articleCategoryKeys.all, 'list', params] as const,
  detail: (id: string) => [...articleCategoryKeys.all, 'detail', id] as const,
};

/* ─── Hooks ───────────────────────────────────────────────── */

/** Fetch paginated article category list */
export function useArticleCategoryList(params?: { search?: string; status?: string; page?: number; limit?: number }) {
  return useQuery<PaginatedArticleCategory, ApiError>({
    queryKey: articleCategoryKeys.list(params),
    queryFn: () => ArticleCategoryService.getAll(params),
  });
}

/** Create a new article category */
export function useCreateArticleCategory() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: Partial<Omit<ArticleCategory, 'id' | 'created_at' | 'updated_at'>>) =>
      ArticleCategoryService.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: articleCategoryKeys.all });
      toast.success(getSuccessMessage({ slug: 'CATEGORY_CREATED' }, t as any, 'articles'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'articles'));
    },
  });
}

/** Update an existing article category */
export function useUpdateArticleCategory() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<ArticleCategory, 'id' | 'created_at' | 'updated_at'>> }) =>
      ArticleCategoryService.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: articleCategoryKeys.all });
      toast.success(getSuccessMessage({ slug: 'CATEGORY_UPDATED' }, t as any, 'articles'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'articles'));
    },
  });
}

/** Delete an article category */
export function useDeleteArticleCategory() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => ArticleCategoryService.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: articleCategoryKeys.all });
      toast.success(getSuccessMessage({ slug: 'CATEGORY_DELETED' }, t as any, 'articles'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'articles'));
    },
  });
}

/* ─── State Hooks ─────────────────────────────────────────── */

export function useArticleCategoryFormDialogState({
  open,
  onOpenChange,
  category
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: any | null;
}) {
  const { t, locale } = useTranslation();
  const dict = t.articles;
  const isEditing = !!category;
  const isRtl = locale === "ar";
  
  const createMutation = useCreateArticleCategory();
  const updateMutation = useUpdateArticleCategory();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);

  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);

  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [isOgImagePickerOpen, setIsOgImagePickerOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState("");

  const formDict = dict.form;
  const catDict = t.categories || {};
  const settingsDict = (catDict as any).settingsSheet || {};

  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [isIndexable, setIsIndexable] = useState(true);
  const [metaTitleEdited, setMetaTitleEdited] = useState(!!category);
  const [metaDescEdited, setMetaDescEdited] = useState(!!category);

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevCategoryId, setPrevCategoryId] = useState(category?.id);

  if (open !== prevOpen || category?.id !== prevCategoryId) {
    setPrevOpen(open);
    setPrevCategoryId(category?.id);
    if (open) {
      if (category) {
        setTitle(category.title || "");
        setSlug(category.slug || "");
        setSlugEdited(true);
        setExcerpt(category.excerpt || "");
        setPreviewImageUrl(category.preview_image_url || "");
        setSortOrder(category.sort_order ?? 0);
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
            id: String(f.id || nanoid()),
            name: String(f.key || f.name || ""),
            type,
            value: val
          };
        });
        setCustomFields(parsedFields);

        if (category.seo_metadata) {
          try {
            const seo = typeof category.seo_metadata === 'string' ? JSON.parse(category.seo_metadata) : category.seo_metadata;
            setMetaTitle(seo.title || "");
            setMetaDesc(seo.description || "");
            setOgImage(seo.ogImage || "");
            setCanonicalUrl(seo.canonicalUrl || "");
            setIsIndexable(seo.isIndexable ?? true);
            setMetaTitleEdited(true);
            setMetaDescEdited(true);
          } catch (e) {
            console.error("Failed to parse SEO metadata", e);
          }
        }
      } else {
        setTitle("");
        setSlug("");
        setSlugEdited(false);
        setExcerpt("");
        setPreviewImageUrl("");
        setSortOrder(0);
        setIsActive(true);
        setCustomFields([]);
        setErrors({});
        setSlugError("");
        
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

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugEdited) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
    }
    if (!metaTitleEdited) {
      setMetaTitle(val);
    }
  };

  const handleSlugChange = (val: string) => {
    setSlug(val);
    setSlugEdited(true);
  };

  const handleExcerptChange = (val: string) => {
    setExcerpt(val);
    if (!metaDescEdited) {
      setMetaDesc(val);
    }
  };

  const checkSlug = async (currentSlug: string) => {
    if (!currentSlug) return true;
    try {
      const isAvailable = await SearchService.checkSlug(currentSlug, 'article_categories', isEditing ? category.id : undefined);
      if (!isAvailable) {
        setSlugError(formDict?.slugTaken || "This slug is already in use");
        return false;
      }
      setSlugError("");
      return true;
    } catch (error) {
      console.error("Failed to check slug availability", error);
      return true; 
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (slug) {
        checkSlug(slug);
      } else {
        setSlugError("");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [slug]);

  const mapCustomFieldsToApi = (fields: CustomFieldDefinition[]) => {
    return fields.map(f => {
      const base = {
        id: f.id || nanoid(),
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
    setErrors({});
    
    if (slugError) return;

    const seoMetadata = {
      title: metaTitle,
      description: metaDesc,
      ogImage,
      canonicalUrl,
      isIndexable
    };

    const payload = {
      title,
      slug,
      excerpt,
      preview_image_url: previewImageUrl,
      sort_order: sortOrder,
      is_active: isActive ? 1 : 0,
      meta_data: mapCustomFieldsToApi(customFields),
      seo_data: seoMetadata
    };

    try {
      const schema = isEditing ? updateArticleCategorySchema : createArticleCategorySchema;
      schema.parse(payload);
    } catch (err: any) {
      const zErrors = extractZodErrors(err);
      setErrors(zErrors);
      return;
    }

    const isSlugAvailable = await checkSlug(slug);
    if (!isSlugAvailable) return;

    setSaving(true);
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: category.id, data: payload as any });
      } else {
        await createMutation.mutateAsync(payload as any);
      }
      onOpenChange(false);
    } catch (err) {
      const apiErrs = extractApiErrors(err as any, t as any, 'articles');
      if (Object.keys(apiErrs).length > 0) {
        setErrors(apiErrs);
      }
    } finally {
      setSaving(false);
    }
  };

  const addCustomField = (field: CustomFieldDefinition) => {
    setCustomFields([...customFields, field]);
  };

  const updateCustomField = (id: string, value: string | string[]) => {
    setCustomFields(customFields.map(f => f.id === id ? { ...f, value } : f));
  };

  const saveEditedField = (updatedField: CustomFieldDefinition) => {
    setCustomFields(customFields.map(f => f.id === updatedField.id ? updatedField : f));
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  return {
    t, locale, dict, isEditing, isRtl,
    title, setTitle, handleTitleChange,
    slug, setSlug, handleSlugChange, slugError,
    excerpt, setExcerpt, handleExcerptChange,
    previewImageUrl, setPreviewImageUrl,
    sortOrder, setSortOrder,
    isActive, setIsActive,
    customFields, addCustomField, updateCustomField, saveEditedField, removeCustomField,
    isFieldModalOpen, setIsFieldModalOpen,
    isEditModalOpen, setIsEditModalOpen,
    editingField, setEditingField,
    isMediaPickerOpen, setIsMediaPickerOpen,
    isOgImagePickerOpen, setIsOgImagePickerOpen,
    saving, handleSubmit, errors,
    formDict, settingsDict,
    metaTitle, setMetaTitle,
    metaDesc, setMetaDesc,
    ogImage, setOgImage,
    canonicalUrl, setCanonicalUrl,
    isIndexable, setIsIndexable
  };
}

export function useArticleCategorySettingsDialogState({
  open,
  onOpenChange,
  category
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: ArticleCategory | null;
}) {
  const { t, locale } = useTranslation();
  const dict = t.articles;
  const catDict = t.categories;
  const formDict = dict.form;
  const settingsDict = catDict?.settingsSheet;
  const isRtl = locale === "ar";

  const updateMutation = useUpdateArticleCategory();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);

  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [isIndexable, setIsIndexable] = useState(true);

  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState("");
  const [isOgImagePickerOpen, setIsOgImagePickerOpen] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevCategoryId, setPrevCategoryId] = useState(category?.id);

  if (open !== prevOpen || category?.id !== prevCategoryId) {
    setPrevOpen(open);
    setPrevCategoryId(category?.id);
    if (open && category) {
      setTitle(category.title || "");
      setSlug(category.slug || "");
      setSlugEdited(true);
      setExcerpt(category.excerpt || "");
      setPreviewImageUrl(category.preview_image_url || "");
      setSortOrder(category.sort_order ?? 0);
      setIsActive(category.is_active === 1 || category.is_active === true);

      const apiMetaData = (Array.isArray(category.meta_data) ? category.meta_data : []) as Record<string, unknown>[];
      setCustomFields(apiMetaData.map((f) => {
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
          id: String(f.id || nanoid()),
          name: String(f.key || f.name || ""),
          type,
          value: val
        };
      }));

      if (category.seo_data) {
        try {
          const seo = typeof category.seo_data === 'string' ? JSON.parse(category.seo_data) : category.seo_data;
          setMetaTitle(seo.title || "");
          setMetaDesc(seo.description || "");
          setOgImage(seo.ogImage || "");
          setCanonicalUrl(seo.canonicalUrl || "");
          setIsIndexable(seo.isIndexable ?? true);
        } catch (e) {
          console.error("Failed to parse SEO metadata", e);
        }
      }
    }
  }

  const checkSlug = async (currentSlug: string) => {
    if (!currentSlug) return true;
    try {
      const isAvailable = await SearchService.checkSlug(currentSlug, 'article_categories', category?.id);
      if (!isAvailable) {
        setSlugError(formDict?.slugTaken || "This slug is already in use");
        return false;
      }
      setSlugError("");
      return true;
    } catch (error) {
      console.error("Failed to check slug availability", error);
      return true;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (slug && category && slug !== category.slug) {
        checkSlug(slug);
      } else {
        setSlugError("");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [slug, category]);

  const mapCustomFieldsToApi = (fields: CustomFieldDefinition[]) => {
    return fields.map(f => {
      const base = {
        id: f.id || nanoid(),
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
    if (!category) return;
    if (slugError) return;

    const seoMetadata = {
      title: metaTitle,
      description: metaDesc,
      ogImage,
      canonicalUrl,
      isIndexable
    };

    const payload = {
      title,
      slug,
      excerpt,
      preview_image_url: previewImageUrl,
      sort_order: sortOrder,
      is_active: isActive ? 1 : 0,
      meta_data: mapCustomFieldsToApi(customFields),
      seo_data: seoMetadata
    };

    try {
      updateArticleCategorySchema.parse(payload);
    } catch (err: any) {
      const zErrors = extractZodErrors(err);
      toast.error((dict.form as any)?.validationError || "Please check the form for errors");
      return;
    }

    if (slug !== category.slug) {
      const isSlugAvailable = await checkSlug(slug);
      if (!isSlugAvailable) return;
    }

    setSaving(true);
    try {
      await updateMutation.mutateAsync({ id: category.id, data: payload as any });
      onOpenChange(false);
    } catch (err) {
      const apiErrs = extractApiErrors(err as any, t as any, 'articles');
      toast.error(getErrorMessage(err, t as any, 'articles'));
    } finally {
      setSaving(false);
    }
  };

  const addCustomField = (field: CustomFieldDefinition) => {
    setCustomFields([...customFields, field]);
  };

  const updateCustomField = (id: string, value: string | string[]) => {
    setCustomFields(customFields.map(f => f.id === id ? { ...f, value } : f));
  };

  const saveEditedField = (updatedField: CustomFieldDefinition) => {
    setCustomFields(customFields.map(f => f.id === updatedField.id ? updatedField : f));
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  return {
    t, locale, dict, isRtl,
    title, setTitle,
    slug, setSlug, slugError,
    excerpt, setExcerpt,
    previewImageUrl, setPreviewImageUrl,
    sortOrder, setSortOrder,
    isActive, setIsActive,
    customFields, addCustomField, updateCustomField, saveEditedField, removeCustomField,
    isFieldModalOpen, setIsFieldModalOpen,
    isEditModalOpen, setIsEditModalOpen,
    editingField, setEditingField,
    isMediaPickerOpen, setIsMediaPickerOpen,
    isOgImagePickerOpen, setIsOgImagePickerOpen,
    saving, handleSubmit,
    formDict, settingsDict,
    metaTitle, setMetaTitle,
    metaDesc, setMetaDesc,
    ogImage, setOgImage,
    canonicalUrl, setCanonicalUrl,
    isIndexable, setIsIndexable
  };
}

