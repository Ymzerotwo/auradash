"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, Type, AlignLeft, Image as ImageIcon, Video, PlaySquare, Link, Smile, List, Calendar, Copy } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { CustomFieldModal, type CustomFieldDefinition } from "@/components/ui/CustomFieldModal";
import { EditCustomFieldModal } from "@/components/ui/EditCustomFieldModal";
import { MediaPickerDialog } from "@/components/ui/MediaPickerDialog";
import { type Dictionary } from "@/lib/i18n/dictionaries";

import { type ServiceData } from "@/lib/services/service.service";
import { useDuplicateServiceDialogState } from "@/lib/hooks/useServices";

/**
 * Duplicate dialog for standalone services (no category).
 * Copies the meta_data field structure (labels + types) from the source service
 * but resets all values, name, slug, and SEO to empty — creating a clean template.
 */
export function DuplicateServiceDialog({
  open,
  onOpenChange,
  sourceService,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceService: ServiceData;
}) {
  const { t, locale } = useTranslation();
  const dict = t.services;
  const isRtl = locale === "ar";

  const state = useDuplicateServiceDialogState({ open, onOpenChange, sourceService });
  const {
    title, setTitle,
    slug, setSlug,
    slugEdited, setSlugEdited,
    sortOrder, setSortOrder,
    isActive, setIsActive,
    errors,
    customFields,
    isFieldModalOpen, setIsFieldModalOpen,
    isEditModalOpen, setIsEditModalOpen,
    editingField, setEditingField,
    saving,
    slugError,
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
  } = state;

  const formDict = dict.form;
  const catDict = t.categories;
  const settingsDict = catDict.settingsSheet;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-2rem)] sm:w-full !max-w-[540px] p-0 overflow-hidden !rounded-2xl bg-surface-card"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-60" />
          <DialogClose render={
            <button className="dialog-close-btn">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          } />
          <DialogHeader className="gap-1.5 pe-8">
            <DialogTitle className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              <Copy size={18} className="text-amber-500" />
              {dict.actions.duplicate} — {sourceService?.name || ""}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-text-muted leading-relaxed m-0">
              {dict.actions.duplicateDesc}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="h-px bg-border-default" />

        <div className="px-6 py-0 pb-5 max-h-[60vh] overflow-y-auto">
          <Tabs defaultValue="general" className="w-full h-full flex flex-col pt-5">
            <TabsList className="flex w-full items-center gap-1 bg-surface-subtle border border-border-default rounded-xl p-1 h-auto mb-2">
              <TabsTrigger value="general" className="flex-1 rounded-lg py-2 text-sm font-semibold data-[state=active]:bg-surface-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                {settingsDict?.tabs?.general || "General"}
              </TabsTrigger>
              <TabsTrigger value="seo" className="flex-1 rounded-lg py-2 text-sm font-semibold data-[state=active]:bg-surface-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                {settingsDict?.tabs?.seo || "SEO"}
              </TabsTrigger>
            </TabsList>

            <div className="py-2">
              <TabsContent value="general" className="m-0 flex flex-col gap-5 data-[state=inactive]:hidden">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dup-s-title" className="text-xs font-medium text-text-subtle">{formDict.title}</Label>
                  <Input
                    id="dup-s-title"
                    value={title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setTitle(newTitle);
                      if (!slugEdited) {
                        setSlug(newTitle.toLowerCase().trim()
                          .replace(/[^\p{L}\p{N}]+/gu, '-')
                          .replace(/^-+|-+$/g, ''));
                      }
                      if (!metaTitleEdited) setMetaTitle(newTitle);
                    }}
                    placeholder={formDict.titlePlaceholder}
                    className="h-10 !rounded-lg text-sm"
                    error={errors.name}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dup-s-slug" className="text-xs font-medium text-text-subtle">{formDict.slug} <span className="text-destructive">*</span></Label>
                  <Input
                    id="dup-s-slug"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setSlugEdited(true);
                    }}
                    placeholder={formDict.slugPlaceholder}
                    dir="ltr"
                    className="h-10 !rounded-lg text-sm text-start"
                    error={slugError || errors.slug}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 mt-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="dup-s-sort-order" className="text-xs font-medium text-text-subtle">{formDict.sortOrder}</Label>
                    <Input
                      id="dup-s-sort-order"
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="0"
                      className="h-10 !rounded-lg text-sm"
                      error={errors.sort_order}
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
                        {formDict.isActive}
                      </span>
                      <div className={`w-10 h-[22px] rounded-full flex items-center px-[3px] transition-colors duration-300 shrink-0 ${isActive ? "bg-primary" : "bg-surface-subtle border border-border-default"}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${isActive ? (isRtl ? "-translate-x-[16px]" : "translate-x-[16px]") : "translate-x-0"}`} />
                      </div>
                    </div>
                  </div>
                </div>

              <div className="flex flex-col gap-3 mt-2 pt-5 border-t border-border-default">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <Label className="text-sm font-bold text-foreground">{formDict.contentBlocksTitle}</Label>
                    <span className="text-[11px] text-text-muted mt-0.5">
                      {formDict.contentBlocksDesc}
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
                    {dict.customFields.addElement}
                  </Button>
                </div>

                {!["name", "price"].every(req => customFields.some(f => f.id === req || f.name.toLowerCase() === req)) && (
                  <div className="mt-1 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </span>
                    <p className="text-[12px] font-medium text-amber-600 leading-relaxed">
                      {formDict.bookingsWarning || "Warning: To link this service with the Bookings System, you must add elements named 'name' and 'price'."}
                    </p>
                  </div>
                )}

                {customFields.length === 0 ? (
                  <div className="text-xs text-text-muted italic text-center py-6 bg-surface-subtle/30 rounded-xl border border-border-default border-dashed">
                    {dict.customFields?.noFields || "No custom fields added yet."}
                  </div>
                ) : (
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
                      const normalizedType = field.type;
                      const meta = typeColorMap[normalizedType] ?? { icon: <Type size={14} />, color: "text-text-muted", bg: "bg-surface-subtle" };
                      const fieldErrorKey = Object.keys(errors).find(k => k.startsWith(`meta_data.${index}.`));
                      const fieldError = fieldErrorKey ? errors[fieldErrorKey] : null;
                      return (
                      <div key={field.id} className="flex flex-col gap-1">
                        <div className={`flex items-center justify-between p-2.5 bg-surface-subtle/50 border ${fieldError ? 'border-destructive' : 'border-border-default'} rounded-xl group transition-all hover:border-primary/30`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg} ${meta.color}`}>
                            {meta.icon}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground">{field.name}</span>
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}>
                              {normalizedType === "list" ? "Text Array" : normalizedType}
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
                            onClick={() => handleRemoveCustomField(field.id)}
                            className="h-7 w-7 p-0 text-text-muted hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                      {fieldError && <span className="text-[11px] font-medium text-destructive px-1">{fieldError}</span>}
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="seo" className="m-0 flex flex-col gap-5 data-[state=inactive]:hidden pt-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dup-s-seo-title" className="text-xs font-medium text-text-subtle">{settingsDict?.seo?.metaTitle || "Meta Title"}</Label>
                <Input id="cf-seo-title" value={metaTitle} onChange={(e) => { setMetaTitle(e.target.value); setMetaTitleEdited(true); }} placeholder={settingsDict?.seo?.metaTitle || "Meta Title"} className="h-10 !rounded-lg text-sm" error={errors['seo_data.meta_title']} />
                <span className="text-[11px] text-text-muted">{settingsDict?.seo?.metaTitleHint || "The title that appears in search results."}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dup-s-seo-desc" className="text-xs font-medium text-text-subtle">{settingsDict?.seo?.metaDesc || "Meta Description"}</Label>
                <Textarea id="cf-seo-desc" value={metaDesc} onChange={(e) => { setMetaDesc(e.target.value); setMetaDescEdited(true); }} placeholder={settingsDict?.seo?.metaDesc || "Meta Description"} className="min-h-[100px] w-full !bg-background border border-input !rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:border-primary focus-visible:ring-0 focus-visible:shadow-[0_0_15px_rgba(79,70,229,0.25)] transition-all resize-y" error={errors['seo_data.meta_description']} />
                <span className="text-[11px] text-text-muted">{settingsDict?.seo?.metaDescHint || "A short description."}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-text-subtle">{settingsDict?.seo?.ogImage || "OG Image"}</Label>
                {ogImage ? (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden group border border-border-default">
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
                        {dict?.actions?.changeImage || "Change Image"}
                      </Button>
                      <Button 
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setOgImage("")}
                        className="h-9 px-3 gap-1.5 text-xs font-medium rounded-lg"
                      >
                        <Trash2 size={14} />
                        {dict?.actions?.remove || "Remove"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsOgImagePickerOpen(true)}
                    className="w-full h-32 border-dashed border-2 border-border-default hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 flex flex-col gap-2 items-center justify-center rounded-xl cursor-pointer"
                  >
                    <div className="p-2 bg-surface-subtle rounded-lg text-text-muted group-hover:text-primary transition-colors">
                      <ImageIcon size={20} />
                    </div>
                    <span className="text-xs font-medium text-text-subtle">
                      {dict?.actions?.chooseShareImage || "Choose Share Image (OG Image)"}
                    </span>
                  </Button>
                )}
                {errors['seo_data.og_image'] && <span className="text-[11px] font-medium text-destructive px-1">{errors['seo_data.og_image']}</span>}
                <span className="text-[11px] text-text-muted">{settingsDict?.seo?.ogImageHint || "Image shown when shared on social media."}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dup-s-seo-canonical" className="text-xs font-medium text-text-subtle">{settingsDict?.seo?.canonicalUrl || "Canonical URL"}</Label>
                <Input id="cf-seo-canonical" value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="https://example.com/service/slug" dir="ltr" className="h-10 !rounded-lg text-sm text-start" error={errors['seo_data.canonical_url']} />
                <span className="text-[11px] text-text-muted">{settingsDict?.seo?.canonicalUrlHint || "The preferred version of this page's URL."}</span>
              </div>
              <div className="flex flex-col gap-1.5 justify-end mt-2">
                <div
                  onClick={() => setIsIndexable(!isIndexable)}
                  className={`flex items-center justify-between p-2.5 h-10 rounded-xl border transition-all duration-200 cursor-pointer select-none
                    ${isIndexable ? "bg-primary/5 border-primary/40" : "bg-transparent border-border-default hover:border-border-strong"}
                  `}
                >
                  <span className={`text-sm font-medium transition-colors ${isIndexable ? "text-foreground" : "text-text-subtle"}`}>
                    {settingsDict?.seo?.isIndexable || "Allow Indexing (is_indexable)"}
                  </span>
                  <div className={`w-10 h-[22px] rounded-full flex items-center px-[3px] transition-colors duration-300 shrink-0 ${isIndexable ? "bg-primary" : "bg-surface-subtle border border-border-default"}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${isIndexable ? (isRtl ? "-translate-x-[16px]" : "translate-x-[16px]") : "translate-x-0"}`} />
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
          </Tabs>
        </div>

        <div className="px-6 py-4 border-t border-border-default flex items-center justify-end gap-3">
          <DialogClose render={<Button variant="outline" type="button" className="h-10 px-5" />}>
            {dict.actions.cancel}
          </DialogClose>

          <Button type="button" onClick={handleSubmit} disabled={saving || !title.trim() || !slug.trim()} className="h-10 px-5 font-semibold bg-amber-600 hover:bg-amber-700 text-white border-none gap-1.5">
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Copy size={14} />}
            {saving ? "" : dict.actions.duplicate}
          </Button>
        </div>

        <CustomFieldModal
          open={isFieldModalOpen}
          onOpenChange={setIsFieldModalOpen}
          onAdd={handleSaveCustomField}
          dict={{ ...formDict, ...dict.customFields }}
          existingFields={customFields}
        />
        <EditCustomFieldModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          onSave={handleSaveCustomField}
          field={editingField}
          dict={{ ...formDict, ...dict.customFields, edit: dict.actions?.edit }}
          existingFields={customFields}
        />
        <MediaPickerDialog
          open={isOgImagePickerOpen}
          onOpenChange={setIsOgImagePickerOpen}
          type="image"
          onSelect={(media) => setOgImage(media.url)}
        />
      </DialogContent>
    </Dialog>
  );
}
