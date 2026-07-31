"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MediaPickerDialog } from "@/components/ui/MediaPickerDialog";
import {
  TextField,
  LongTextField,
  MediaField,
  IconField,
  UrlField,
  ListField,
  DateTimeField,
} from "@/components/ui/dynamic-fields";
import { BlockTypePickerPanel, type BlockType, type ContentBlock, BLOCK_TYPE_DEFS } from "./BlockTypePickerPanel";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  Globe,
  FileText,
  Tag,
  Image as ImageIcon,
  Check,
  Pencil,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";

import { useDuplicateArticleForm } from "@/lib/hooks/useDuplicateArticleForm";

// ─── Props ────────────────────────────────────────────────────────────────────
interface DuplicateArticlePageProps {
  /** Category ID to attach this article to */
  categoryId?: string;
  /** Article ID to duplicate from */
  duplicateFrom: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function DuplicateArticlePage({ categoryId, duplicateFrom }: DuplicateArticlePageProps) {
  const router = useRouter();

  const {
    t, locale, dict, af,
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
  } = useDuplicateArticleForm({ categoryId, duplicateFrom });

  const blocksDict = dict.blocks;
  const seoDict = dict.seo;
  const isRtl = locale === "ar";
  const createTitle = af.duplicateTitle;
  const subtitle = af.duplicateSubtitle;

  // ─── Block field renderer ───────────────────────────────────────────────────
  const renderBlockFields = (block: ContentBlock, idx: number) => {
    const d = (key: string) => (block.data as Record<string, any>)[key] || "";
    const e = (key: string) => errors[`meta_data.${idx}.data.${key}`];
    const commonDict = { chooseImage: dict.form.chooseImage, chooseVideo: af.addBlock };
    switch (block.type) {
      case "text-info":
        return (
          <TextField
            label={blocksDict.textInfo}
            value={d("text")}
            onChange={(v) => handleUpdateBlockData(block.id, "text", v)}
            placeholder={dict.customFields.textPlaceholder}
            error={e("text")}
          />
        );
      case "text-description":
        return (
          <LongTextField
            label={blocksDict.textDescription}
            value={d("text")}
            onChange={(v) => handleUpdateBlockData(block.id, "text", v)}
            placeholder={dict.customFields.textPlaceholder}
            error={e("text")}
          />
        );
      case "photo":
        return (
          <div className="flex flex-col gap-3">
            <MediaField
              label={blocksDict.photo}
              value={d("url")}
              onChange={(v) => handleUpdateBlockData(block.id, "url", v)}
              type="image"
              dict={commonDict}
              error={e("url")}
            />
            <TextField
              label={blocksDict.altText}
              value={d("alt")}
              onChange={(v) => handleUpdateBlockData(block.id, "alt", v)}
              placeholder={blocksDict.altPlaceholder}
              error={e("alt")}
            />
          </div>
        );
      case "video":
        return (
          <MediaField
            label={blocksDict.video}
            value={d("url")}
            onChange={(v) => handleUpdateBlockData(block.id, "url", v)}
            type="video"
            dict={commonDict}
            error={e("url")}
          />
        );
      case "video-youtube":
        return (
          <UrlField
            label={blocksDict.youtubeUrl}
            value={d("url")}
            onChange={(v) => handleUpdateBlockData(block.id, "url", v)}
            placeholder={blocksDict.youtubePlaceholder}
            error={e("url")}
          />
        );
      case "date_time":
        return (
          <DateTimeField
            label={blocksDict.dateTime}
            value={d("value")}
            onChange={(v) => handleUpdateBlockData(block.id, "value", v)}
            error={e("value")}
          />
        );
      case "link":
        return (
          <div className="flex flex-col gap-3">
            <UrlField
              label={blocksDict.link}
              value={d("url")}
              onChange={(v) => handleUpdateBlockData(block.id, "url", v)}
              error={e("url")}
            />
            <TextField
              label={blocksDict.linkLabel}
              value={d("label")}
              onChange={(v) => handleUpdateBlockData(block.id, "label", v)}
              placeholder={blocksDict.linkPlaceholder}
              error={e("label")}
            />
          </div>
        );
      case "list":
        return (
          <ListField
            label={blocksDict.items}
            value={(block.data.items as string[]) ?? []}
            onChange={(v) => handleUpdateBlockData(block.id, "items", v)}
            dict={{
              placeholder: dict.customFields.listPlaceholder,
              empty: dict.customFields.listEmpty,
            }}
            error={e("items")}
          />
        );
      case "icon":
        return (
          <IconField
            label={blocksDict.icon}
            value={d("name")}
            onChange={(v) => handleUpdateBlockData(block.id, "name", v)}
            dict={{ chooseIcon: blocksDict.chooseIcon }}
            error={e("name")}
          />
        );
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout pageTitle={createTitle}>
      <div className="flex flex-col gap-6 w-full pb-8 max-w-[1400px] mx-auto">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center border border-border-default bg-surface-card text-text-muted hover:text-foreground hover:border-border-strong transition-all cursor-pointer outline-none"
            >
              <ArrowLeft size={16} className={isRtl ? "rotate-180" : ""} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground m-0 leading-tight">
                {createTitle}
              </h1>
              <p className="text-sm text-text-muted m-0 mt-0.5">{subtitle}</p>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !title.trim() || !slug.trim() || !!slugError}
            className="w-full sm:w-auto h-10 px-6 font-semibold gap-2 rounded-xl"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {dict.actions.saveChanges}
          </Button>
        </div>

        {/* ── Responsive Two-column layout ── */}
        <div className="flex flex-col xl:flex-row gap-6 items-start w-full">

          {/* ══════════════ LEFT: Main Content ══════════════ */}
          <div className="flex-1 w-full min-w-0 flex flex-col gap-5">

            {/* Basic Information card */}
            <div className="bg-surface-card border border-border-default rounded-2xl overflow-hidden">
              <div className="relative px-5 pt-5 pb-4 border-b border-border-default">
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <FileText size={14} />
                  </div>
                  <h2 className="text-sm font-bold text-foreground">{af.sectionBasic}</h2>
                </div>
              </div>

              <div className="p-5 flex flex-col md:flex-row xl:flex-col 2xl:flex-row gap-6 items-start">
                <div className="flex-1 w-full min-w-0 flex flex-col gap-5">
                  {/* Public title */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="af-title" className="text-xs font-medium text-text-subtle">
                      {dict.form.title} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="af-title"
                      value={title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        setTitle(newTitle);
                        if (!slugEdited) {
                          setSlug(generateSlug(newTitle));
                        }
                        if (!metaTitleEdited) {
                          setMetaTitle(newTitle);
                        }
                      }}
                      placeholder={dict.form.titlePlaceholder}
                      className="h-10 !rounded-lg text-sm"
                      error={errors.title}
                    />
                  </div>

                  {/* Slug */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="af-slug" className="text-xs font-medium text-text-subtle">
                      {dict.form.slug} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="af-slug"
                      value={slug}
                      onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
                      placeholder={dict.form.slugPlaceholder}
                      dir="ltr"
                      className="h-10 !rounded-lg text-sm text-start"
                      error={slugError || errors.slug}
                    />
                  </div>

                  {/* Excerpt */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="af-excerpt" className="text-xs font-medium text-text-subtle">
                      {af.excerpt}
                    </Label>
                    <Textarea
                      id="af-excerpt"
                      value={excerpt}
                      onChange={(e) => {
                        const newExcerpt = e.target.value;
                        setExcerpt(newExcerpt);
                        if (!metaDescEdited) {
                          setMetaDesc(newExcerpt.substring(0, 155));
                        }
                      }}
                      placeholder={af.excerptPlaceholder}
                      className="min-h-[100px] w-full !bg-background border border-input !rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:border-primary focus-visible:ring-0 focus-visible:shadow-[0_0_15px_rgba(79,70,229,0.25)] transition-all resize-y"
                    />
                  </div>
                </div>

                {/* Cover Image */}
                <div className="flex flex-col gap-1.5 w-full md:w-[280px] xl:w-full 2xl:w-[300px] shrink-0">
                  <Label className="text-xs font-medium text-text-subtle">
                    {af.sectionCover}
                  </Label>
                  <div className="w-full">
                    {previewImageUrl ? (
                      <div className="relative group rounded-xl overflow-hidden border border-border-default bg-surface-subtle/50 aspect-[16/9] w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewImageUrl}
                          alt="Cover preview"
                          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsMediaPickerOpen(true)}
                            className="h-8 px-3 gap-1.5 text-xs font-medium rounded-lg"
                          >
                            {af.changeCoverImage}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setPreviewImageUrl("")}
                            className="h-8 w-8 p-0 flex items-center justify-center rounded-lg bg-red-500 hover:bg-red-600 text-white"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsMediaPickerOpen(true)}
                        className="w-full h-auto aspect-[16/9] border-dashed border-2 border-border-default hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 flex flex-col gap-2 items-center justify-center rounded-xl"
                      >
                        <div className="p-2.5 bg-surface-subtle rounded-xl text-text-muted">
                          <Search size={20} />
                        </div>
                        <span className="text-xs font-medium text-text-subtle">{af.chooseCoverImage}</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Blocks Builder card */}
            <div className="bg-surface-card border border-border-default rounded-2xl overflow-hidden">
              <div className="relative px-5 pt-5 pb-4 border-b border-border-default">
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-40" />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-foreground">{af.sectionContent}</h2>
                    <p className="text-xs text-text-muted mt-0.5">{af.sectionContentDesc}</p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setIsPickerOpen(true)}
                    size="sm"
                    className="h-8 px-3 gap-1.5 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-white border-none shrink-0"
                  >
                    <Plus size={14} />
                    {af.addBlock}
                  </Button>
                </div>
              </div>

              <div className="p-5 flex flex-col gap-3">
                {blocks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-surface-subtle/60 border border-dashed border-border-default rounded-xl gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-border-default flex items-center justify-center text-text-muted">
                      <Tag size={22} />
                    </div>
                    <p className="text-xs font-medium text-text-muted text-center max-w-[200px]">
                      {af.noBlocks}
                    </p>
                  </div>
                ) : (
                  blocks.map((block, idx) => {
                    const isExpanded = expandedBlockId === block.id;
                    const typeDef = BLOCK_TYPE_DEFS.find((d) => d.type === block.type);
                    const blockErrorKey = Object.keys(errors).find((k) => k.startsWith(`meta_data.${idx}.`));
                    const blockError = blockErrorKey ? errors[blockErrorKey] : null;
                    return (
                      <div className="flex flex-col gap-1" key={block.id}>
                      <div
                        className={`border rounded-xl transition-all duration-200 ${
                          isExpanded
                            ? "border-primary/30 bg-surface-card shadow-sm"
                            : blockError
                            ? "border-destructive bg-surface-subtle/40 hover:border-destructive/80"
                            : "border-border-default bg-surface-subtle/40 hover:border-border-strong"
                        }`}
                      >
                        {/* Block Header */}
                        <div
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                          onClick={() => toggleBlock(block.id)}
                        >
                          {/* Drag handle (visual only — v1) */}
                          <div className="flex flex-col gap-[3px] shrink-0 text-text-muted/40 cursor-grab">
                            {[0,1,2].map((i) => (
                              <div key={i} className="flex gap-[3px]">
                                <div className="w-[3px] h-[3px] rounded-full bg-current" />
                                <div className="w-[3px] h-[3px] rounded-full bg-current" />
                              </div>
                            ))}
                          </div>

                          {/* Block type icon */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeDef?.bg ?? "bg-surface-subtle"} ${typeDef?.color ?? "text-text-muted"}`}>
                            {typeDef?.icon}
                          </div>

                          {/* Label & index */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {block.label || `Block ${idx + 1}`}
                            </p>
                            <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                              {block.type}
                            </p>
                          </div>

                          {/* Controls */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-destructive hover:bg-destructive/10 transition-colors border-none outline-none bg-transparent cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                            <div className="w-6 h-6 flex items-center justify-center text-text-muted">
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                          </div>
                        </div>

                        {/* Block Body — only rendered when expanded */}
                        {isExpanded && (
                          <div className="px-4 pb-4 flex flex-col gap-4 border-t border-border-default/60 pt-4">
                            {/* Label input */}
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-xs font-medium text-text-subtle">{af.blockLabel}</Label>
                              <Input
                                value={block.label}
                                onChange={(e) => handleUpdateBlockLabel(block.id, e.target.value)}
                                placeholder={af.blockLabelPlaceholder}
                                className="h-9 !rounded-lg text-sm"
                                error={errors[`meta_data.${idx}.label`]}
                              />
                            </div>
                            {/* Dynamic field */}
                            {renderBlockFields(block, idx)}
                          </div>
                        )}
                      </div>
                      {!isExpanded && blockError && <span className="text-[11px] font-medium text-destructive px-1">{blockError}</span>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ══════════════ RIGHT: Sidebar ══════════════ */}
          <div className="w-full xl:w-[340px] 2xl:w-[360px] shrink-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-5 xl:sticky xl:top-6">

            {/* Publishing card */}
            <div className="bg-surface-card border border-border-default rounded-2xl overflow-hidden">
              <div className="relative px-5 pt-5 pb-4 border-b border-border-default">
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-40" />
                <h3 className="text-sm font-bold text-foreground">{af.sidebarPublishing}</h3>
              </div>
              <div className="p-5 flex flex-col gap-4">
                {/* Active toggle */}
                <div
                  onClick={() => setIsActive((v) => !v)}
                  className={`flex items-center justify-between p-2.5 h-10 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                    isActive ? "bg-primary/5 border-primary/40" : "bg-transparent border-border-default hover:border-border-strong"
                  }`}
                >
                  <span className={`text-sm font-medium transition-colors ${isActive ? "text-foreground" : "text-text-subtle"}`}>
                    {dict.form.isActive}
                  </span>
                  <div className={`w-10 h-[22px] rounded-full flex items-center px-[3px] transition-colors duration-300 shrink-0 ${isActive ? "bg-primary" : "bg-surface-subtle border border-border-default"}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${isActive ? (isRtl ? "-translate-x-[16px]" : "translate-x-[16px]") : "translate-x-0"}`} />
                  </div>
                </div>

                {/* Published At */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-text-subtle">{af.publishedAt}</Label>
                  <Input
                    type="datetime-local"
                    value={publishedAt ? new Date(publishedAt).toISOString().slice(0, 16) : ""}
                    onChange={(e) => setPublishedAt(e.target.value ? new Date(e.target.value).toISOString() : "")}
                    className="h-10 !rounded-lg text-sm"
                    dir="ltr"
                  />
                </div>

                {/* Reading time */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-text-subtle">{af.readingTime}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={readingTime}
                    onChange={(e) => setReadingTime(e.target.value)}
                    placeholder={af.readingTimePlaceholder}
                    className="h-10 !rounded-lg text-sm"
                    dir="ltr"
                    error={errors.reading_time_minutes}
                  />
                </div>

                {/* Sort order */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-text-subtle">{dict.form.sortOrder}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="h-10 !rounded-lg text-sm"
                    dir="ltr"
                    error={errors.sort_order}
                  />
                </div>

                {/* Author */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-text-subtle">{isRtl ? "الناشر / الكاتب" : "Publisher / Author"}</Label>
                  <div className="flex items-center justify-between p-3 bg-surface-subtle/50 border border-border-default rounded-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                        {selectedAuthorPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={selectedAuthorPhoto} alt="Author" className="w-full h-full object-cover" />
                        ) : (
                          selectedAuthorName ? selectedAuthorName.charAt(0).toUpperCase() : "?"
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-text-muted leading-none">{isRtl ? "الكاتب الحالي" : "Current Author"}</span>
                        <span className="text-xs font-bold text-foreground mt-0.5 truncate">{selectedAuthorName || (isRtl ? "غير محدد" : "Not specified")}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAuthorSearchQuery("");
                        setIsAuthorSelectOpen(true);
                      }}
                      className="h-8 px-2.5 text-xs font-semibold rounded-lg gap-1.5 border border-border-default bg-surface-card hover:bg-surface-subtle text-text-muted hover:text-foreground shrink-0 cursor-pointer"
                    >
                      <Pencil size={12} />
                      {isRtl ? "تعديل" : "Edit"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* SEO Accordion card */}
            <div className="bg-surface-card border border-border-default rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setIsSeoOpen((v) => !v)}
                className="w-full relative px-5 pt-5 pb-4 border-b border-border-default flex items-center justify-between cursor-pointer outline-none bg-transparent"
              >
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-40" />
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Globe size={14} />
                  </div>
                  <div className="text-start">
                    <h3 className="text-sm font-bold text-foreground">{af.sidebarSeo}</h3>
                    {!isSeoOpen && <p className="text-[11px] text-text-muted">{af.sidebarSeoDesc}</p>}
                  </div>
                </div>
                {isSeoOpen ? <ChevronUp size={16} className="text-text-muted shrink-0" /> : <ChevronDown size={16} className="text-text-muted shrink-0" />}
              </button>

              {isSeoOpen && (
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-text-subtle">{seoDict.metaTitle}</Label>
                    <Input value={metaTitle} onChange={(e) => { setMetaTitle(e.target.value); setMetaTitleEdited(true); }} placeholder={seoDict.metaTitle} className="h-10 !rounded-lg text-sm" />
                    <span className="text-[11px] text-text-muted">{seoDict.metaTitleHint}</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-text-subtle">{seoDict.metaDesc}</Label>
                    <Textarea
                      value={metaDesc}
                      onChange={(e) => { setMetaDesc(e.target.value); setMetaDescEdited(true); }}
                      placeholder={seoDict.metaDesc}
                      className="min-h-[100px] w-full !bg-background border border-input !rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:border-primary focus-visible:ring-0 focus-visible:shadow-[0_0_15px_rgba(79,70,229,0.25)] transition-all resize-y"
                    />
                    <span className="text-[11px] text-text-muted">{seoDict.metaDescHint}</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-text-subtle">{seoDict.ogImage}</Label>
                    {ogImage ? (
                      <div className="relative w-full h-24 rounded-xl overflow-hidden group border border-border-default">
                        <img 
                          src={ogImage} 
                          alt="OG Preview" 
                          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                          <Button 
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsOgImagePickerOpen(true)}
                            className="h-9 px-3 gap-1.5 text-xs font-medium rounded-lg"
                          >
                            <ImageIcon size={14} />
                            {isRtl ? "تغيير الصورة" : "Change Image"}
                          </Button>
                          <Button 
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setOgImage("")}
                            className="h-9 px-3 gap-1.5 text-xs font-medium rounded-lg bg-red-500 hover:bg-red-600 text-white"
                          >
                            <Trash2 size={14} />
                            {isRtl ? "حذف" : "Remove"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsOgImagePickerOpen(true)}
                        className="w-full h-24 border-dashed border-2 border-border-default hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 flex flex-col gap-2 items-center justify-center rounded-xl cursor-pointer"
                      >
                        <div className="p-2 bg-surface-subtle rounded-lg text-text-muted group-hover:text-primary transition-colors">
                          <ImageIcon size={20} />
                        </div>
                        <span className="text-xs font-medium text-text-subtle">
                          {isRtl ? "اختر صورة للمشاركة (OG Image)" : "Choose Share Image (OG Image)"}
                        </span>
                      </Button>
                    )}
                    {errors['seo_data.og_image'] && <span className="text-[11px] font-medium text-destructive px-1">{errors['seo_data.og_image']}</span>}
                    <span className="text-[11px] text-text-muted">{seoDict.ogImageHint}</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-text-subtle">{seoDict.canonicalUrl}</Label>
                    <Input value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="https://example.com/articles/slug" dir="ltr" className="h-10 !rounded-lg text-sm text-start" />
                    <span className="text-[11px] text-text-muted">{seoDict.canonicalUrlHint}</span>
                  </div>

                  <div
                    onClick={() => setIsIndexable((v) => !v)}
                    className={`flex items-center justify-between p-2.5 h-10 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                      isIndexable ? "bg-primary/5 border-primary/40" : "bg-transparent border-border-default hover:border-border-strong"
                    }`}
                  >
                    <span className={`text-sm font-medium transition-colors ${isIndexable ? "text-foreground" : "text-text-subtle"}`}>
                      {seoDict.isIndexable}
                    </span>
                    <div className={`w-10 h-[22px] rounded-full flex items-center px-[3px] transition-colors duration-300 shrink-0 ${isIndexable ? "bg-primary" : "bg-surface-subtle border border-border-default"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${isIndexable ? (isRtl ? "-translate-x-[16px]" : "translate-x-[16px]") : "translate-x-0"}`} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Block Type Picker Panel ── */}
      <BlockTypePickerPanel
        open={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleAddBlock}
        dict={blocksDict}
      />

      {/* ── Cover Image Media Picker ── */}
      <MediaPickerDialog
        open={isMediaPickerOpen}
        onOpenChange={setIsMediaPickerOpen}
        type="image"
        onSelect={(media) => setPreviewImageUrl(media.url)}
      />

      {/* ── OG Image Media Picker ── */}
      <MediaPickerDialog
        open={isOgImagePickerOpen}
        onOpenChange={setIsOgImagePickerOpen}
        type="image"
        onSelect={(media) => setOgImage(media.url)}
      />

      {/* ── Author Selection Dialog ── */}
      <Dialog open={isAuthorSelectOpen} onOpenChange={setIsAuthorSelectOpen}>
        <DialogContent
          className="w-[calc(100vw-2rem)] sm:w-full !max-w-[400px] p-0 overflow-hidden !rounded-2xl bg-surface-card"
          showCloseButton={false}
        >
          <div className="relative px-5 pt-5 pb-4 border-b border-border-default">
            <DialogClose render={
              <button className="dialog-close-btn">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            } />
            <DialogHeader className="gap-1.5 pe-8">
              <DialogTitle className="text-sm font-bold text-foreground">
                {isRtl ? "تحديد الكاتب" : "Select Author"}
              </DialogTitle>
              <DialogDescription className="text-xs text-text-muted">
                {isRtl ? "ابحث عن الكاتب وحدده من القائمة أدناه." : "Search and select the author from the list below."}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-4 flex flex-col gap-3">
            <div>
              <Input
                value={authorSearchQuery}
                icon={Search}
                onChange={(e) => setAuthorSearchQuery(e.target.value)}
                placeholder={isRtl ? "البحث بالاسم..." : "Search by name..."}
                className="h-9 rounded-lg text-xs w-full"
              />
            </div>
            
            {/* Scrollable list */}
            <div className="flex flex-col gap-1.5 max-h-[250px] overflow-y-auto pr-1">
              {publishersLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="animate-spin text-primary" size={20} />
                </div>
              ) : filteredPublishers?.length === 0 ? (
                <div className="text-xs text-text-muted italic text-center py-4">
                  {isRtl ? "لا توجد نتائج تطابق بحثك." : "No results match your search."}
                </div>
              ) : (
                filteredPublishers?.map((pub) => (
                  <button
                    key={pub.id}
                    type="button"
                    onClick={() => {
                      setAuthorId(pub.id);
                      setIsAuthorSelectOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-start transition-all cursor-pointer ${
                      authorId === pub.id
                        ? "bg-primary/5 border-primary/40"
                        : "bg-transparent border-transparent hover:bg-surface-subtle"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                        {pub.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={pub.photo_url} alt={pub.full_name} className="w-full h-full object-cover" />
                        ) : (
                          pub.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="text-xs font-semibold text-foreground">{pub.full_name}</span>
                    </div>
                    {authorId === pub.id && (
                      <Check size={14} className="text-primary shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
