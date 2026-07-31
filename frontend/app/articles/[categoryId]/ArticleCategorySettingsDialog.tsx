"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Plus, Trash2, Layers, Type, AlignLeft, Image as ImageIcon, Video, PlaySquare, Link, Smile, List, Calendar } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { CustomFieldModal, type CustomFieldDefinition } from "@/components/ui/CustomFieldModal";
import { EditCustomFieldModal } from "@/components/ui/EditCustomFieldModal";
import { MediaPickerDialog } from "@/components/ui/MediaPickerDialog";

import { type ArticleCategory } from "@/lib/services/article-category.service";
import { useArticleCategorySettingsDialogState } from "@/lib/hooks/useArticleCategories";

export function ArticleCategorySettingsDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: ArticleCategory | null;
}) {
  const { t, locale } = useTranslation();
  const dict = t.articles;
  const isRtl = locale === "ar";

  const state = useArticleCategorySettingsDialogState({ open, onOpenChange, category });
  const {
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
  } = state;

  const fDict = formDict as any;
  const sDict = settingsDict as any;

  const renderFieldInput = (field: CustomFieldDefinition) => {
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
            {items.map((item, idx) => (
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
                    const newItems = items.filter((_, i) => i !== idx);
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="w-[calc(100vw-2rem)] sm:w-full !max-w-[540px] p-0 overflow-hidden !rounded-2xl bg-surface-card"
          showCloseButton={false}
        >
          {/* Header */}
          <div className="relative px-6 pt-6 pb-5">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
            <DialogClose render={
              <button className="dialog-close-btn">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            } />
            <DialogHeader className="gap-1.5 pe-8">
              <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
                {sDict?.title || "Category Settings"}
              </DialogTitle>
              <DialogDescription className="text-[13px] text-text-muted leading-relaxed m-0">
                {sDict?.description || "Manage settings, SEO, and schema for this category."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="h-px bg-border-default" />

          <div className="px-6 py-0 pb-5 max-h-[60vh] overflow-y-auto">
            <Tabs defaultValue="general" className="w-full h-full flex flex-col pt-5">
              <TabsList className="flex w-full items-center gap-1 bg-surface-subtle border border-border-default rounded-xl p-1 h-auto mb-2">
                <TabsTrigger value="general" className="flex-1 rounded-lg py-2 text-sm font-semibold data-[state=active]:bg-surface-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  {sDict?.tabs?.general || "General"}
                </TabsTrigger>
                <TabsTrigger value="seo" className="flex-1 rounded-lg py-2 text-sm font-semibold data-[state=active]:bg-surface-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  {sDict?.tabs?.seo || "SEO"}
                </TabsTrigger>
              </TabsList>

              <div className="py-2">
                <form id="category-settings-form" onSubmit={handleSubmit}>
                  {/* General Tab */}
                  <TabsContent value="general" className="m-0 flex flex-col gap-5 data-[state=inactive]:hidden">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="settings-title" className="text-xs font-medium text-text-subtle">
                        {fDict?.title || "Title"} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="settings-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={fDict?.titlePlaceholder || "Enter category title..."}
                        className="h-10 !rounded-lg text-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="settings-slug" className="text-xs font-medium text-text-subtle">
                        {fDict?.slug || "Slug"} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="settings-slug"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder={fDict?.slugPlaceholder || "category-slug"}
                        dir="ltr"
                        className="h-10 !rounded-lg text-sm text-start"
                        error={slugError}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="settings-excerpt" className="text-xs font-medium text-text-subtle">
                        {dict?.categoryForm?.excerpt || fDict?.excerpt || (isRtl ? "المقتطف" : "Excerpt")}
                      </Label>
                      <Textarea
                        id="settings-excerpt"
                        value={excerpt}
                        onChange={(e) => setExcerpt(e.target.value)}
                        placeholder={dict?.categoryForm?.excerptPlaceholder || fDict?.excerptPlaceholder || (isRtl ? "نبذة قصيرة تظهر في بطاقات التصنيفات..." : "Short summary shown in category cards...")}
                        className="min-h-[80px] w-full !bg-background border border-input !rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:border-primary focus-visible:ring-0 focus-visible:shadow-[0_0_15px_rgba(79,70,229,0.25)] transition-all resize-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-medium text-text-subtle">{fDict?.previewImage || "Preview Image"}</Label>
                      {previewImageUrl ? (
                        <div className="relative w-full h-24 rounded-xl overflow-hidden group border border-border-default">
                          <img 
                            src={previewImageUrl} 
                            alt="Preview" 
                            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                            <Button 
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => setIsMediaPickerOpen(true)}
                              className="h-9 px-3 gap-1.5 text-xs font-medium rounded-lg"
                            >
                              <ImageIcon size={14} />
                              {fDict?.changeImage || "Change Image"}
                            </Button>
                            <Button 
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => setPreviewImageUrl("")}
                              className="h-9 px-3 gap-1.5 text-xs font-medium rounded-lg"
                            >
                              <Trash2 size={14} />
                              {fDict?.removeImage || "Remove"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsMediaPickerOpen(true)}
                          className="w-full h-24 border-dashed border-2 border-border-default bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:hover:bg-input/50 transition-all duration-300 flex flex-row gap-2 items-center justify-center rounded-xl cursor-pointer"
                        >
                          <div className="p-2.5 bg-surface-subtle rounded-xl text-text-muted">
                            <ImageIcon size={20} />
                          </div>
                          <span className="text-xs font-medium text-text-subtle">
                            {fDict?.choosePreviewImage || "Choose Preview Image"}
                          </span>
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="settings-sort-order" className="text-xs font-medium text-text-subtle">{fDict?.sortOrder || "Sort Order"}</Label>
                        <Input
                          id="settings-sort-order"
                          type="number"
                          value={sortOrder}
                          onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="h-10 !rounded-lg text-sm"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 justify-end">
                        <div
                          onClick={() => setIsActive(!isActive)}
                          className={`flex items-center justify-between p-2.5 h-10 rounded-xl border transition-all duration-200 cursor-pointer select-none
                            ${isActive ? "bg-primary/5 border-primary/40" : "bg-transparent border-border-default hover:border-border-strong"}
                          `}
                        >
                          <span className={`text-sm font-medium transition-colors ${isActive ? "text-foreground" : "text-text-subtle"}`}>
                            {fDict?.isActive || "Active"}
                          </span>
                          <div className={`w-10 h-[22px] rounded-full flex items-center px-[3px] transition-colors duration-300 shrink-0 ${isActive ? "bg-primary" : "bg-surface-subtle border border-border-default"}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${isActive ? (isRtl ? "-translate-x-[16px]" : "translate-x-[16px]") : "translate-x-0"}`} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Custom Fields Section */}
                    <div className="flex flex-col gap-3 mt-2 pt-5 border-t border-border-default">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <Label className="text-sm font-bold text-foreground">{fDict?.customFields || "Custom Fields"}</Label>
                          <span className="text-[11px] text-text-muted mt-0.5">
                            {fDict?.customFieldsDesc || "Define schema for category"}
                          </span>
                        </div>
                        <Button
                          type="button"
                          onClick={() => setIsFieldModalOpen(true)}
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs font-semibold"
                        >
                          <Plus size={14} />
                          {fDict?.addField || "Add Field"}
                        </Button>
                      </div>

                      {customFields.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {customFields.map((field, index) => {
                            const typeColorMap: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
                              "text":             { icon: <Type size={14} />,       color: "text-blue-500",    bg: "bg-blue-500/10"    },
                              "text-description": { icon: <AlignLeft size={14} />,  color: "text-amber-500",   bg: "bg-amber-500/10"   },
                              "image":            { icon: <ImageIcon size={14} />,  color: "text-emerald-500", bg: "bg-emerald-500/10" },
                              "video":            { icon: <Video size={14} />,      color: "text-purple-500",  bg: "bg-purple-500/10"  },
                              "video-youtube":    { icon: <PlaySquare size={14} />, color: "text-red-500",     bg: "bg-red-500/10"     },
                              "url":              { icon: <Link size={14} />,       color: "text-cyan-500",    bg: "bg-cyan-500/10"    },
                              "icon":             { icon: <Smile size={14} />,      color: "text-pink-500",    bg: "bg-pink-500/10"    },
                              "list":             { icon: <List size={14} />,       color: "text-orange-500",  bg: "bg-orange-500/10"  },
                              "datetime":         { icon: <Calendar size={14} />,   color: "text-indigo-500",  bg: "bg-indigo-500/10"  },
                            };
                            const meta = typeColorMap[field.type] ?? { icon: <Type size={14} />, color: "text-text-muted", bg: "bg-surface-subtle" };

                            return (
                              <div key={field.id} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between p-2.5 bg-surface-subtle/50 border border-border-default rounded-xl group transition-all hover:border-primary/30">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg} ${meta.color}`}>
                                      {meta.icon}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-foreground">{field.name}</span>
                                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}>
                                        {field.type === "list" ? "Text Array" : field.type}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingField(field);
                                        setIsEditModalOpen(true);
                                      }}
                                      className="h-7 w-7 p-0 text-text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeCustomField(field.id)}
                                      className="h-7 w-7 p-0 text-text-muted hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-6 px-4 bg-surface-subtle/50 border border-dashed border-border-default rounded-xl">
                          <Layers size={24} className="text-text-muted/50 mb-2" />
                          <span className="text-xs font-medium text-text-muted">
                            {fDict?.noCustomFields || "No custom fields"}
                          </span>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* SEO Tab */}
                  <TabsContent value="seo" className="m-0 flex flex-col gap-5 data-[state=inactive]:hidden pt-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="cf-seo-title" className="text-xs font-medium text-text-subtle">{sDict?.seo?.metaTitle || "Meta Title"}</Label>
                      <Input 
                        id="cf-seo-title" 
                        value={metaTitle} 
                        onChange={(e) => setMetaTitle(e.target.value)} 
                        placeholder={sDict?.seo?.metaTitleHint || (isRtl ? "العنوان الذي يظهر في نتائج محركات البحث..." : "The title that appears in search results...")} 
                        className="h-10 !rounded-lg text-sm" 
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="cf-seo-desc" className="text-xs font-medium text-text-subtle">{sDict?.seo?.metaDesc || "Meta Description"}</Label>
                      <Textarea 
                        id="cf-seo-desc" 
                        value={metaDesc} 
                        onChange={(e) => setMetaDesc(e.target.value)} 
                        placeholder={sDict?.seo?.metaDescHint || (isRtl ? "وصف قصير يظهر أسفل العنوان في نتائج البحث..." : "A short description of the category...")} 
                        className="min-h-[100px] w-full !bg-background border border-input !rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:border-primary focus-visible:ring-0 focus-visible:shadow-[0_0_15px_rgba(79,70,229,0.25)] transition-all resize-y" 
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-medium text-text-subtle">{sDict?.seo?.ogImage || "OG Image"}</Label>
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
                              className="h-9 px-3 gap-1.5 text-xs font-medium rounded-lg"
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
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="cf-seo-canonical" className="text-xs font-medium text-text-subtle">{sDict?.seo?.canonicalUrl || "Canonical URL"}</Label>
                      <Input 
                        id="cf-seo-canonical" 
                        value={canonicalUrl} 
                        onChange={(e) => setCanonicalUrl(e.target.value)} 
                        placeholder={sDict?.seo?.canonicalUrlHint || "https://..."} 
                        dir="ltr" 
                        className="h-10 !rounded-lg text-sm text-start" 
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 justify-end mt-2">
                      <div 
                        onClick={() => setIsIndexable(!isIndexable)} 
                        className={`flex items-center justify-between p-2.5 h-10 rounded-xl border transition-all duration-200 cursor-pointer select-none ${isIndexable ? "bg-primary/5 border-primary/40" : "bg-transparent border-border-default hover:border-border-strong"}`}
                      >
                        <span className={`text-sm font-medium transition-colors ${isIndexable ? "text-foreground" : "text-text-subtle"}`}>{sDict?.seo?.allowIndexing || "Allow Indexing"}</span>
                        <div className={`w-10 h-[22px] rounded-full flex items-center px-[3px] transition-colors duration-300 shrink-0 ${isIndexable ? "bg-primary" : "bg-surface-subtle border border-border-default"}`}>
                          <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${isIndexable ? (isRtl ? "-translate-x-[16px]" : "translate-x-[16px]") : "translate-x-0"}`} />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </form>
              </div>
            </Tabs>
          </div>

          <div className="px-6 py-4 border-t border-border-default flex items-center justify-between">
            <DialogClose render={<Button variant="outline" type="button" className="h-10 px-5" />}>
              {fDict?.cancel || "Cancel"}
            </DialogClose>

            <Button 
              type="button" 
              onClick={handleSubmit} 
              disabled={saving || !title.trim() || !slug.trim() || !!slugError} 
              className="px-5 font-semibold gap-1.5"
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
              {saving ? "" : dict?.actions?.saveChanges || "Save Changes"}
            </Button>
          </div>

          <CustomFieldModal
            open={isFieldModalOpen}
            onOpenChange={setIsFieldModalOpen}
            onAdd={addCustomField}
            dict={{ ...fDict, ...dict.customFields }}
            existingFields={customFields}
          />
          {editingField && (
            <EditCustomFieldModal
              open={isEditModalOpen}
              onOpenChange={setIsEditModalOpen}
              onSave={saveEditedField}
              field={editingField}
              dict={{ ...fDict, ...dict.customFields, edit: dict.actions?.edit }}
              existingFields={customFields}
            />
          )}
          <MediaPickerDialog
            open={isMediaPickerOpen}
            onOpenChange={setIsMediaPickerOpen}
            onSelect={(media) => setPreviewImageUrl(typeof media === 'string' ? media : media.url)}
          />
          <MediaPickerDialog
            open={isOgImagePickerOpen}
            onOpenChange={setIsOgImagePickerOpen}
            type="image"
            onSelect={(media) => setOgImage(typeof media === 'string' ? media : media.url)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
