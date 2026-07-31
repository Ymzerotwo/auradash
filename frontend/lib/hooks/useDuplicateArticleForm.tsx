import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArticleService } from '../services/article.service';
import { toast } from 'sonner';
import { ApiError } from '../api/client';
import { getErrorMessage, extractApiErrors } from '../utils/error';
import { useTranslation } from '../i18n/LanguageContext';
import { useAuthStore } from '../stores/auth.store';
import { SearchService } from '../services/search.service';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { createArticleSchema } from '../validations/article.schema';
import { extractZodErrors } from '../validations/common.schema';
import type { BlockType, ContentBlock } from '@/app/articles/BlockTypePickerPanel';
import { useCreateArticle, usePublisherList } from './useArticles';

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

export function useDuplicateArticleForm({
  categoryId,
  duplicateFrom
}: {
  categoryId?: string;
  duplicateFrom: string;
}) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const dict = t.articles;
  const af = dict.articleForm;
  
  const isEditing = false; 

  const createMutation = useCreateArticle();
  const currentUser = useAuthStore((s) => s.user);
  const { data: publishersData, isLoading: publishersLoading } = usePublisherList();

  const [isAuthorSelectOpen, setIsAuthorSelectOpen] = useState(false);
  const [authorSearchQuery, setAuthorSearchQuery] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugError, setSlugError] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [publishedAt, setPublishedAt] = useState("");
  const [readingTime, setReadingTime] = useState("");
  const [authorId, setAuthorId] = useState(currentUser?.id ?? "");

  const [blocks, setBlocks] = useState<ContentBlock[]>([]);

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
  const [metaTitleEdited, setMetaTitleEdited] = useState(false);
  const [metaDescEdited, setMetaDescEdited] = useState(false);

  const { data: sourceArticle } = useQuery({
    queryKey: ["articles", "detail", duplicateFrom],
    queryFn: () => ArticleService.getById(duplicateFrom),
    enabled: !!duplicateFrom,
  });

  // Hydrate core fields when duplicate source arrives
  useEffect(() => {
    if (sourceArticle) {
      setTitle("");
      setSlug("");
      setExcerpt("");
      setPreviewImageUrl("");
      setSortOrder(0);
      setIsActive(true);
      setPublishedAt("");
      setReadingTime("");
      setAuthorId(currentUser?.id ?? "");
      
      if (sourceArticle.meta_data) {
        try {
          const raw = typeof sourceArticle.meta_data === "string"
            ? JSON.parse(sourceArticle.meta_data)
            : sourceArticle.meta_data;
          if (Array.isArray(raw)) {
            setBlocks(raw.map((b: Record<string, unknown>) => ({
              id: String(nanoid()),
              type: String(b.type || "text-info") as BlockType,
              label: String(b.label || ""),
              data: getDefaultBlockData(String(b.type || "text-info") as BlockType),
            })));
          }
        } catch { /* ignore */ }
      }
    }
  }, [sourceArticle, currentUser]);

  // Hydrate SEO
  useEffect(() => {
    if (!sourceArticle?.seo_data) return;
    const seo = (typeof sourceArticle.seo_data === "string"
      ? JSON.parse(sourceArticle.seo_data)
      : sourceArticle.seo_data) as Record<string, unknown>;
    
    setMetaTitle("");
    setMetaDesc("");
    setOgImage(String(seo.og_image ?? ""));
    setCanonicalUrl(String(seo.canonical_url ?? ""));
    setIsIndexable(Boolean(seo.is_indexable ?? true));
  }, [sourceArticle]);

  const selectedAuthor = publishersData?.find((p) => p.id === authorId);
  const selectedAuthorName = selectedAuthor?.full_name || (authorId === currentUser?.id ? currentUser?.full_name : authorId);
  const selectedAuthorPhoto = selectedAuthor?.photo_url || (authorId === currentUser?.id ? currentUser?.photo_url : null);

  const filteredPublishers = publishersData?.filter((pub) =>
    pub.full_name.toLowerCase().includes(authorSearchQuery.toLowerCase())
  );

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!slug || slug.length < 2) { setSlugError(""); return; }
      try {
        const available = await SearchService.checkSlug(slug, 'articles');
        setSlugError(available ? "" : dict.form.slugTaken || "Slug is already taken");
      } catch { setSlugError(""); }
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, dict.form.slugTaken]);

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

      const schema = createArticleSchema;
      const result = schema.safeParse(payload);
      if (!result.success) {
        setErrors(extractZodErrors(result.error, t as any, 'common.zod'));
        toast.error(t.common.zod.fix_errors);
        setSaving(false);
        return;
      }
      setErrors({});

      await createMutation.mutateAsync(payload);

      router.push(`/articles`);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.slug === 'VALIDATION_ERROR' && e.details && e.details.length > 0) {
        const apiErrors = extractApiErrors(e, t as any, 'common.errors');
        if (Object.keys(apiErrors).length > 0) {
          setErrors(apiErrors);
          return;
        }
      }
      if (e instanceof ApiError && e.slug) {
        toast.error(getErrorMessage(e, t as any, 'articles'));
      } else {
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
    handleAddBlock, handleDeleteBlock, handleUpdateBlockLabel, handleUpdateBlockData, toggleBlock,
    handleSubmit, generateSlug
  };
}
