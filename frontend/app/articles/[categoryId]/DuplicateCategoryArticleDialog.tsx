"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, Type, AlignLeft, Image as ImageIcon, Video, PlaySquare, Link, Smile, List, Calendar, Copy, Check } from "lucide-react";
import { CustomFieldModal } from "@/components/ui/CustomFieldModal";
import { EditCustomFieldModal } from "@/components/ui/EditCustomFieldModal";
import { MediaPickerDialog } from "@/components/ui/MediaPickerDialog";
import { type ArticleData } from "@/lib/services/article.service";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useDuplicateCategoryArticleDialogState } from "@/lib/hooks/useArticles";

export function DuplicateCategoryArticleDialog({
  open,
  onOpenChange,
  sourceArticle,
  categoryId,
  categoryTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceArticle: ArticleData;
  categoryId: string;
  categoryTitle?: string;
}) {
  const { t } = useTranslation();
  const state = useDuplicateCategoryArticleDialogState({ open, onOpenChange, sourceArticle, categoryId });
  const {
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
  } = state;

  const renderFieldInput = (field: any) => {
    switch (field.type) {
      case 'text':
      case 'url':
      case 'icon':
        return (
          <Input 
            value={(field.value as string) || ''} 
            onChange={(e) => updateCustomField(field.id, e.target.value)}
            className="h-9"
          />
        );
      case 'text-description':
        return (
          <Textarea 
            value={(field.value as string) || ''} 
            onChange={(e) => updateCustomField(field.id, e.target.value)}
            rows={3}
            className="resize-none"
          />
        );
      case 'image':
      case 'video':
      case 'video-youtube':
        return (
          <div className="flex gap-2">
            <Input 
              value={(field.value as string) || ''} 
              onChange={(e) => updateCustomField(field.id, e.target.value)}
              className="h-9 flex-1"
            />
          </div>
        );
      case 'datetime':
        return (
          <Input 
            type="datetime-local"
            value={(field.value as string) || ''} 
            onChange={(e) => updateCustomField(field.id, e.target.value)}
            className="h-9"
          />
        );
      case 'list':
        const items = Array.isArray(field.value) ? field.value : [];
        return (
          <div className="flex flex-col gap-2">
            {items.map((item: string, idx: number) => (
              <div key={idx} className="flex gap-2">
                <Input 
                  value={item} 
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[idx] = e.target.value;
                    updateCustomField(field.id, newItems);
                  }}
                  className="h-9 flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  className="h-9 w-9 shrink-0"
                  onClick={() => {
                    const newItems = items.filter((_: any, i: number) => i !== idx);
                    updateCustomField(field.id, newItems);
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => updateCustomField(field.id, [...items, ""])}
            >
              <Plus size={14} className="me-1" /> Add Item
            </Button>
          </div>
        );
      default:
        return <Input value={String(field.value || '')} onChange={(e) => updateCustomField(field.id, e.target.value)} className="h-9" />;
    }
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'text': return 'Type';
      case 'text-description': return 'AlignLeft';
      case 'image': return 'ImageIcon';
      case 'video': return 'Video';
      case 'video-youtube': return 'PlaySquare';
      case 'icon': return 'Smile';
      case 'url': return 'Link';
      case 'datetime': return 'Calendar';
      case 'list': return 'List';
      default: return 'Type';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-border-default shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Copy size={20} />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">
                  Duplicate as Template
                </DialogTitle>
                <DialogDescription className="text-sm text-text-muted mt-1">
                  Creating a new article in <span className="font-medium text-foreground">{categoryTitle}</span> using blocks from "{sourceArticle?.title}".
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-6 bg-surface-subtle p-1 rounded-lg">
                <TabsTrigger value="general" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  General
                </TabsTrigger>
                <TabsTrigger value="blocks" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
                  Content Blocks
                  {customFields.length > 0 && (
                    <span className="absolute -top-1 -end-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {customFields.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="seo" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  SEO
                </TabsTrigger>
              </TabsList>

              <form id="duplicate-article-form" onSubmit={handleSubmit}>
                {/* General Tab */}
                <TabsContent value="general" className="mt-0 space-y-6 focus-visible:outline-none">
                  {/* Status Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border-subtle bg-surface-subtle/30">
                    <div>
                      <Label className="text-base font-medium">Active Status</Label>
                      <p className="text-xs text-text-muted mt-1">Make this new article visible</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isActive} 
                        onChange={(e) => setIsActive(e.target.checked)} 
                      />
                      <div className="w-11 h-6 bg-surface-subtle peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border-subtle after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {/* Title & Slug */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="dup-title" className="text-sm font-medium">
                        Title <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="dup-title"
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Enter new title..."
                        required
                        className={errors.title ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dup-slug" className="text-sm font-medium">
                        Slug <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="dup-slug"
                        value={slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        placeholder="new-url-slug"
                        required
                        dir="ltr"
                        className={`font-mono text-sm ${errors.slug || slugError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      />
                      {errors.slug && <p className="text-xs text-destructive mt-1">{errors.slug}</p>}
                      {slugError && <p className="text-xs text-destructive mt-1">{slugError}</p>}
                    </div>
                  </div>

                  {/* Excerpt */}
                  <div className="space-y-2">
                    <Label htmlFor="dup-excerpt" className="text-sm font-medium">Excerpt</Label>
                    <Textarea
                      id="dup-excerpt"
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      placeholder="Brief summary for this new article..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                </TabsContent>

                {/* Blocks Tab */}
                <TabsContent value="blocks" className="mt-0 space-y-6 focus-visible:outline-none">
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 bg-primary/10 rounded-md text-primary">
                        <Copy size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-foreground">Cloned Structure</h4>
                        <p className="text-xs text-text-muted mt-1 leading-relaxed">
                          The content block structure has been cloned from the source article. All content values have been cleared. You can fill them in now or later.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Content Blocks</Label>
                      <Button type="button" size="sm" variant="outline" onClick={() => setIsFieldModalOpen(true)}>
                        <Plus size={14} className="me-1" /> Add Block
                      </Button>
                    </div>

                    {customFields.length === 0 ? (
                      <div className="border border-dashed border-border-default rounded-xl p-8 text-center bg-surface-subtle/30 flex flex-col items-center justify-center">
                        <p className="text-sm text-text-muted">Source article had no custom blocks.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {customFields.map((field) => (
                          <div key={field.id} className="bg-surface-card border border-border-subtle rounded-xl p-4 transition-all hover:border-border-default group">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-surface-subtle rounded-md text-text-muted">
                                  {getFieldIcon(field.type) === 'AlignLeft' && <AlignLeft size={14} />}
                                  {getFieldIcon(field.type) === 'ImageIcon' && <ImageIcon size={14} />}
                                  {getFieldIcon(field.type) === 'Video' && <Video size={14} />}
                                  {getFieldIcon(field.type) === 'PlaySquare' && <PlaySquare size={14} />}
                                  {getFieldIcon(field.type) === 'Smile' && <Smile size={14} />}
                                  {getFieldIcon(field.type) === 'Link' && <Link size={14} />}
                                  {getFieldIcon(field.type) === 'Calendar' && <Calendar size={14} />}
                                  {getFieldIcon(field.type) === 'List' && <List size={14} />}
                                  {getFieldIcon(field.type) === 'Type' && <Type size={14} />}
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-foreground block">{field.name}</span>
                                  <span className="text-[10px] text-text-muted uppercase tracking-wider font-mono">{field.type.replace('-', ' ')}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  type="button" 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 text-text-muted hover:text-amber-500"
                                  onClick={() => {
                                    setEditingField(field);
                                    setIsEditModalOpen(true);
                                  }}
                                >
                                  <Type size={12} />
                                </Button>
                                <Button 
                                  type="button" 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 text-text-muted hover:text-destructive"
                                  onClick={() => removeCustomField(field.id)}
                                >
                                  <Trash2 size={12} />
                                </Button>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-border-subtle/50">
                              {renderFieldInput(field)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* SEO Tab */}
                <TabsContent value="seo" className="mt-0 space-y-6 focus-visible:outline-none">
                  <div className="bg-surface-subtle/50 border border-border-subtle rounded-lg p-4 mb-6">
                    <p className="text-sm text-text-muted m-0">
                      SEO settings are not copied to prevent duplicate content issues. Please configure them for this new article.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Meta Title */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="dup-metaTitle" className="text-sm font-medium">Meta Title</Label>
                        <span className={`text-xs ${metaTitle.length > 60 ? 'text-amber-500 font-medium' : 'text-text-muted'}`}>
                          {metaTitle.length} / 60
                        </span>
                      </div>
                      <Input
                        id="dup-metaTitle"
                        value={metaTitle}
                        onChange={(e) => setMetaTitle(e.target.value)}
                        placeholder={title || "Article Title"}
                      />
                    </div>

                    {/* Meta Description */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="dup-metaDesc" className="text-sm font-medium">Meta Description</Label>
                        <span className={`text-xs ${metaDesc.length > 160 ? 'text-amber-500 font-medium' : 'text-text-muted'}`}>
                          {metaDesc.length} / 160
                        </span>
                      </div>
                      <Textarea
                        id="dup-metaDesc"
                        value={metaDesc}
                        onChange={(e) => setMetaDesc(e.target.value)}
                        placeholder={excerpt || "Description..."}
                        rows={3}
                        className="resize-none"
                      />
                    </div>

                    {/* OG Image */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Social Share Image (OG Image)</Label>
                      <div className="flex gap-2">
                        <Input
                          value={ogImage}
                          onChange={(e) => setOgImage(e.target.value)}
                          placeholder="https://..."
                          className="flex-1"
                          dir="ltr"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsOgImagePickerOpen(true)}
                          className="shrink-0"
                        >
                          <ImageIcon size={16} className="me-2" />
                          Browse
                        </Button>
                      </div>
                    </div>

                    {/* Canonical URL */}
                    <div className="space-y-2">
                      <Label htmlFor="dup-canonicalUrl" className="text-sm font-medium">Canonical URL</Label>
                      <Input
                        id="dup-canonicalUrl"
                        value={canonicalUrl}
                        onChange={(e) => setCanonicalUrl(e.target.value)}
                        placeholder="https://..."
                        dir="ltr"
                      />
                    </div>

                    {/* Indexing Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-border-subtle mt-4">
                      <div>
                        <Label className="text-sm font-medium">Allow Search Engine Indexing</Label>
                        <p className="text-xs text-text-muted mt-1">
                          Turn off to add a noindex meta tag
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={isIndexable} 
                          onChange={(e) => setIsIndexable(e.target.checked)} 
                        />
                        <div className="w-11 h-6 bg-surface-subtle peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border-subtle after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </TabsContent>
              </form>
            </Tabs>
          </div>

          <div className="p-6 border-t border-border-default bg-surface-subtle/10 shrink-0 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button 
              type="submit" 
               
              disabled={saving || !!slugError || !title}
              className="min-w-[140px]"
            >
              {saving ? (
                <><Loader2 size={16} className="animate-spin me-2" /> Saving...</>
              ) : (
                <><Copy size={16} className="me-2" /> Create Copy</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CustomFieldModal
        open={isFieldModalOpen}
        onOpenChange={setIsFieldModalOpen}
        onAdd={addCustomField}
        dict={t.categories?.customFields as any}
      />

      {editingField && (
        <EditCustomFieldModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          field={editingField}
          onSave={saveEditedField}
          dict={t.categories?.customFields as any}
        />
      )}

      <MediaPickerDialog 
        open={isOgImagePickerOpen}
        onOpenChange={setIsOgImagePickerOpen}
        onSelect={(item: any) => setOgImage(typeof item === 'string' ? item : item.url)}
      />
    </>
  );
}

