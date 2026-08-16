"use client";

import React, { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Type,
  Image as ImageIcon,
  Video,
  AlignLeft,
  List,
  Calendar,
  Smile,
  X,
  Link,
  PlaySquare,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  TextField,
  LongTextField,
  MediaField,
  IconField,
  UrlField,
  ListField,
  DateTimeField,
} from "@/components/ui/dynamic-fields";
import type { CustomFieldDefinition } from "./CustomFieldModal";

interface EditCustomFieldModalDict {
  fieldType?: string;
  fieldName: string;
  fieldNamePlaceholder: string;
  fieldValue: string;
  textPlaceholder: string;
  listPlaceholder: string;
  listEmpty: string;
  cancel: string;
  edit?: string;
  save?: string;
  errorEmpty?: string;
  errorInvalidUrl?: string;
  errorInvalidYoutube?: string;
  errorDuplicateName?: string;
}

// ─── Same per-type color map as CustomFieldModal & BlockTypePickerPanel ────────
const TYPE_ICON_MAP: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string; label: string }
> = {
  "text":            { icon: <Type size={16} />,       color: "text-blue-500",    bg: "bg-blue-500/10",    label: "Text"         },
  "text-description":{ icon: <AlignLeft size={16} />,  color: "text-amber-500",   bg: "bg-amber-500/10",   label: "Long Text"    },
  "image":           { icon: <ImageIcon size={16} />,  color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Image"        },
  "video":           { icon: <Video size={16} />,      color: "text-purple-500",  bg: "bg-purple-500/10",  label: "Video"        },
  "video-youtube":   { icon: <PlaySquare size={16} />, color: "text-red-500",     bg: "bg-red-500/10",     label: "YouTube"      },
  "url":             { icon: <Link size={16} />,       color: "text-cyan-500",    bg: "bg-cyan-500/10",    label: "URL"          },
  "icon":            { icon: <Smile size={16} />,      color: "text-pink-500",    bg: "bg-pink-500/10",    label: "Icon"         },
  "list":            { icon: <List size={16} />,       color: "text-orange-500",  bg: "bg-orange-500/10",  label: "List"         },
  "datetime":        { icon: <Calendar size={16} />,   color: "text-indigo-500",  bg: "bg-indigo-500/10",  label: "Date & Time"  },
};

export function EditCustomFieldModal({
  open,
  onOpenChange,
  onSave,
  field: rawField,
  dict,
  existingFields = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (field: CustomFieldDefinition) => void;
  field: CustomFieldDefinition | null;
  dict: EditCustomFieldModalDict;
  existingFields?: CustomFieldDefinition[];
}) {
  const field = rawField ? {
    ...rawField,
    type: ((rawField.type as any) === 'text-info' ? 'text' : (rawField.type as any) === 'photo' ? 'image' : (rawField.type as any) === 'date_time' ? 'datetime' : (rawField.type as any) === 'link' ? 'url' : rawField.type) as CustomFieldDefinition["type"]
  } : null;

  const [fieldName, setFieldName] = useState("");
  const [fieldValue, setFieldValue] = useState<string | string[]>("");

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevFieldId, setPrevFieldId] = useState(field?.id);

  if (open !== prevOpen || field?.id !== prevFieldId) {
    setPrevOpen(open);
    setPrevFieldId(field?.id);
    if (open && field) {
      setFieldName(field.name || "");
      setFieldValue(
        field.value !== undefined
          ? field.value
          : field.type === "list"
          ? []
          : ""
      );
    }
  }

  const handleSave = useCallback(() => {
    const trimmedName = (fieldName || "").trim();
    if (!trimmedName || !field) return;

    // 0. Check for duplicate field names (excluding current field)
    const hasDuplicate = existingFields.some(
      (f) => f.id !== field.id && f.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (hasDuplicate) {
      toast.error(dict.errorDuplicateName || "This name already exists");
      return;
    }

    let isValid = true;
    
    // 1. Check for empty values
    if (
      fieldValue === undefined || 
      fieldValue === null || 
      (typeof fieldValue === 'string' && !fieldValue.trim()) || 
      (Array.isArray(fieldValue) && fieldValue.length === 0)
    ) {
      toast.error(dict.errorEmpty || "Value cannot be empty");
      isValid = false;
    } else if (typeof fieldValue === 'string') {
      const val = fieldValue.trim();
      // 2. Validate standard URL
      if (field.type === 'url') {
        try {
          new URL(val);
        } catch {
          toast.error(dict.errorInvalidUrl || "Please enter a valid URL");
          isValid = false;
        }
      } 
      // 3. Validate YouTube URL
      else if (field.type === 'video-youtube') {
        const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
        if (!ytRegex.test(val)) {
          toast.error(dict.errorInvalidYoutube || "Please enter a valid YouTube URL");
          isValid = false;
        }
      }
    }

    if (!isValid) return;

    onSave({
      ...field,
      name: trimmedName,
      value: fieldValue,
    });

    onOpenChange(false);
  }, [fieldName, fieldValue, field, onSave, onOpenChange]);

  if (!field) return null;

  const typeMeta = TYPE_ICON_MAP[field.type] ?? {
    icon: <Type size={16} />,
    color: "text-text-muted",
    bg: "bg-surface-subtle",
    label: field.type,
  };

  const isFormValid =
    (fieldName || "").trim() !== "" &&
    fieldValue !== undefined &&
    fieldValue !== null &&
    !(typeof fieldValue === "string" && fieldValue.trim() === "") &&
    !(Array.isArray(fieldValue) && fieldValue.length === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[520px] p-0 overflow-hidden !rounded-2xl bg-surface-card border border-border-default shadow-2xl"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 border-b border-border-default">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
          <DialogClose
            render={
              <button className="dialog-close-btn">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            }
          />
          <DialogHeader className="pe-8">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
                {dict.edit || dict.save || "Edit Field"}
              </DialogTitle>
              {/* Type badge — visual indicator of the current field type */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${typeMeta.bg} ${typeMeta.color} text-[11px] font-bold`}
              >
                {typeMeta.icon}
                <span className="uppercase tracking-wider">{typeMeta.label}</span>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
          {/* Field name input */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="edit-field-name"
              className="text-xs font-bold text-text-muted uppercase tracking-wider"
            >
              {dict.fieldName} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-field-name"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              placeholder={dict.fieldNamePlaceholder}
              className="h-10 !rounded-lg text-sm"
              autoFocus
            />
          </div>

          {/* Value editor */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-md flex items-center justify-center ${typeMeta.bg} ${typeMeta.color}`}>
                {React.cloneElement(typeMeta.icon as React.ReactElement, { size: 12 } as any)}
              </div>
              <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                {dict.fieldValue} <span className="text-destructive">*</span>
              </Label>
            </div>
            <div className="mt-1">
              {field.type === "text" && (
                <TextField label="" value={fieldValue as string} onChange={setFieldValue} placeholder={dict.textPlaceholder} />
              )}
              {field.type === "text-description" && (
                <LongTextField label="" value={fieldValue as string} onChange={setFieldValue} placeholder={dict.textPlaceholder} />
              )}
              {field.type === "image" && (
                <MediaField 
                  label="" 
                  value={fieldValue as string} 
                  onChange={setFieldValue} 
                  type="image" 
                  dict={{
                    chooseImage: (dict as any).chooseImage,
                  }}
                />
              )}
              {field.type === "video" && (
                <MediaField 
                  label="" 
                  value={fieldValue as string} 
                  onChange={setFieldValue} 
                  type="video" 
                  dict={{
                    chooseVideo: (dict as any).chooseVideo,
                  }}
                />
              )}
              {field.type === "video-youtube" && (
                <UrlField label="" value={fieldValue as string} onChange={setFieldValue} placeholder="https://youtube.com/watch?v=..." />
              )}
              {field.type === "icon" && (
                <IconField 
                  label="" 
                  value={fieldValue as string} 
                  onChange={setFieldValue} 
                  dict={{
                    chooseIcon: (dict as any).chooseIcon || (dict as any).addIcon,
                    pickIcon: (dict as any).pickIcon || (dict as any).addIcon,
                    searchPlaceholder: (dict as any).searchPlaceholder,
                    select: (dict as any).select,
                    close: (dict as any).close || dict.cancel,
                    noResults: (dict as any).noResults,
                  }}
                />
              )}
              {field.type === "list" && (
                <ListField
                  label=""
                  value={fieldValue as string[]}
                  onChange={setFieldValue}
                  dict={{ placeholder: dict.listPlaceholder, empty: dict.listEmpty }}
                />
              )}
              {field.type === "datetime" && (
                <DateTimeField label="" value={fieldValue as string} onChange={setFieldValue} />
              )}
              {field.type === "url" && (
                <UrlField label="" value={fieldValue as string} onChange={setFieldValue} />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-end gap-3 border-t border-border-default">
          <DialogClose
            render={
              <Button variant="outline" type="button" className="h-10 px-5" />
            }
          >
            {dict.cancel}
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={!isFormValid}
            className="px-5 font-semibold gap-1.5"
          >
            <Check size={14} />
            {dict.save || dict.edit || "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
