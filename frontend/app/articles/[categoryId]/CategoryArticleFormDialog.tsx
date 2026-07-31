"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Check, FileText } from "lucide-react";
import { type ArticleData } from "@/lib/services/article.service";
import { useCategoryArticleFormDialogState } from "@/lib/hooks/useArticles";

export function CategoryArticleFormDialog({
  open,
  onOpenChange,
  article,
  categoryId,
  categoryTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: ArticleData | null;
  categoryId: string;
  categoryTitle?: string;
}) {
  const state = useCategoryArticleFormDialogState({ open, onOpenChange, article, categoryId });
  const {
    dict, isRtl, isEditing,
    title, handleTitleChange,
    slug, handleSlugChange, slugError,
    excerpt, setExcerpt,
    isActive, setIsActive,
    saving, errors,
    handleSubmit
  } = state;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border-default shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                {isEditing ? (dict.form as any)?.editArticle || "Edit Article" : (dict.form as any)?.createArticle || "Create Article"}
              </DialogTitle>
              <DialogDescription className="text-sm text-text-muted mt-1">
                {categoryTitle 
                  ? ((dict.form as any)?.inCategory || 'in category "{category}"').replace('{category}', categoryTitle)
                  : (dict.form as any)?.createDescription || "Provide basic details. You can add full content later."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[70vh] scrollbar-thin">
          <form id="article-quick-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Status Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-border-subtle bg-surface-subtle/30">
              <div>
                <Label className="text-base font-medium">{(dict.form as any)?.statusActive || "Active Status"}</Label>
                <p className="text-xs text-text-muted mt-1">{(dict.form as any)?.statusDescription || "Make this article visible"}</p>
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

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="article-title" className="text-sm font-medium">
                  {(dict.form as any)?.title || "Title"} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="article-title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder={(dict.form as any)?.titlePlaceholder || "Enter article title..."}
                  required
                  className={errors.title ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="article-slug" className="text-sm font-medium">
                  {(dict.form as any)?.slug || "Slug"} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="article-slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder={(dict.form as any)?.slugPlaceholder || "article-url-slug"}
                  required
                  dir="ltr"
                  className={`font-mono text-sm ${errors.slug || slugError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
                {slugError && <p className="text-xs text-destructive">{slugError}</p>}
                <p className="text-xs text-text-muted">
                  {(dict.form as any)?.slugHelp || "Unique URL identifier. Auto-generated from title."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="article-excerpt" className="text-sm font-medium">{(dict.form as any)?.excerpt || "Excerpt"}</Label>
                <Textarea
                  id="article-excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder={(dict.form as any)?.excerptPlaceholder || "Brief summary..."}
                  rows={3}
                  className={`resize-none ${errors.excerpt ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {errors.excerpt && <p className="text-xs text-destructive">{errors.excerpt}</p>}
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-border-default bg-surface-subtle/10 shrink-0 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{(dict.form as any)?.cancel || "Cancel"}</Button>
          <Button 
            type="submit" 
             
            disabled={saving || !!slugError || !title.trim()}
            className="min-w-[120px]"
          >
            {saving ? (
              <><Loader2 size={16} className="animate-spin me-2" /> {(dict.form as any)?.saving || "Saving..."}</>
            ) : (
              <><Check size={16} className="me-2" /> {(dict.form as any)?.save || "Save"}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

