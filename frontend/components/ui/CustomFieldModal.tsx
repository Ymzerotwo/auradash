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

export type CustomFieldType =
  | "text"
  | "text-description"
  | "image"
  | "video"
  | "video-youtube"
  | "icon"
  | "list"
  | "datetime"
  | "url";

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  value?: string | string[];
}

interface CustomFieldModalDict {
  text: string;
  longText: string;
  url: string;
  image: string;
  video: string;
  youtube?: string;
  icon: string;
  list: string;
  datetime: string;
  selectType: string;
  fieldType: string;
  fieldName: string;
  fieldNamePlaceholder: string;
  fieldValue: string;
  textPlaceholder: string;
  listPlaceholder: string;
  listEmpty: string;
  cancel: string;
  add: string;
  edit?: string;
  errorEmpty?: string;
  errorInvalidUrl?: string;
  errorInvalidYoutube?: string;
  errorDuplicateName?: string;
}

// ─── Per-type color & icon config (mirrors BlockTypePickerPanel palette) ──────
interface TypeDef {
  id: CustomFieldType;
  label: (dict: CustomFieldModalDict) => string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  description: string;
}

const TYPE_DEFS: TypeDef[] = [
  {
    id: "text",
    label: (d) => d.text,
    icon: <Type size={20} />,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    description: "Short title or label",
  },
  {
    id: "text-description",
    label: (d) => d.longText,
    icon: <AlignLeft size={20} />,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    description: "Paragraph or long text",
  },
  {
    id: "image",
    label: (d) => d.image,
    icon: <ImageIcon size={20} />,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    description: "Image from media library",
  },
  {
    id: "video",
    label: (d) => d.video,
    icon: <Video size={20} />,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    description: "Hosted video file",
  },
  {
    id: "video-youtube",
    label: (d) => d.youtube || "YouTube Video",
    icon: <PlaySquare size={20} />,
    color: "text-red-500",
    bg: "bg-red-500/10",
    description: "Embed a YouTube URL",
  },
  {
    id: "url",
    label: (d) => d.url,
    icon: <Link size={20} />,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    description: "Clickable URL",
  },
  {
    id: "icon",
    label: (d) => d.icon,
    icon: <Smile size={20} />,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    description: "Lucide icon or CSS class",
  },
  {
    id: "list",
    label: (d) => d.list,
    icon: <List size={20} />,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    description: "Array of text items",
  },
  {
    id: "datetime",
    label: (d) => d.datetime,
    icon: <Calendar size={20} />,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    description: "Date and time field",
  },
];

export function CustomFieldModal({
  open,
  onOpenChange,
  onAdd,
  dict,
  existingFields = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (field: CustomFieldDefinition) => void;
  dict: CustomFieldModalDict;
  existingFields?: CustomFieldDefinition[];
}) {
  const [selectedType, setSelectedType] = useState<CustomFieldType>("text");
  const [fieldName, setFieldName] = useState("");
  const [fieldValue, setFieldValue] = useState<string | string[]>("");

  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFieldName("");
      setSelectedType("text");
      setFieldValue("");
    }
  }

  const handleTypeSelect = useCallback((type: CustomFieldType) => {
    setSelectedType(type);
    setFieldValue(type === "list" ? [] : "");
  }, []);

  const handleAdd = useCallback(() => {
    const trimmedName = (fieldName || "").trim();
    if (!trimmedName) return;

    // 0. Check for duplicate field names (case-insensitive)
    const hasDuplicate = existingFields.some(
      (f) => f.name.trim().toLowerCase() === trimmedName.toLowerCase()
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
      if (selectedType === 'url') {
        try {
          new URL(val);
        } catch {
          toast.error(dict.errorInvalidUrl || "Please enter a valid URL");
          isValid = false;
        }
      } 
      // 3. Validate YouTube URL
      else if (selectedType === 'video-youtube') {
        const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
        if (!ytRegex.test(val)) {
          toast.error(dict.errorInvalidYoutube || "Please enter a valid YouTube URL");
          isValid = false;
        }
      }
    }

    if (!isValid) return;

    onAdd({
      id: crypto.randomUUID(),
      name: trimmedName,
      type: selectedType,
      value: fieldValue,
    });

    onOpenChange(false);
  }, [fieldName, selectedType, fieldValue, onAdd, onOpenChange]);

  const selectedDef = TYPE_DEFS.find((d) => d.id === selectedType)!;

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
            <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
              {dict.selectType}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
          {/* Type picker — 3-column grid matching BlockTypePickerPanel */}
          <div className="flex flex-col gap-2.5">
            <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              {dict.fieldType}
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TYPE_DEFS.map((def) => {
                const isSelected = selectedType === def.id;
                return (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => handleTypeSelect(def.id)}
                    className={`group relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-150 cursor-pointer outline-none text-center ${isSelected
                      ? "border-primary bg-transparent shadow-sm"
                      : "border-border-default bg-transparent hover:border-primary/50"
                      }`}
                  >
                    {/* Selected checkmark */}
                    {isSelected && (
                      <div className="absolute top-2 end-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check size={9} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-150 ${def.bg} ${def.color} ${isSelected ? "scale-110" : "group-hover:scale-105"}`}
                    >
                      {def.icon}
                    </div>
                    <span
                      className={`text-[11px] font-bold leading-tight ${isSelected ? "text-foreground" : "text-text-subtle"
                        }`}
                    >
                      {def.label(dict)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field name input */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="field-name" className="text-xs font-bold text-text-muted uppercase tracking-wider">
              {dict.fieldName} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="field-name"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              placeholder={dict.fieldNamePlaceholder}
              className="h-10 !rounded-lg text-sm"
              autoFocus
            />
          </div>

          {/* Dynamic value preview */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-md flex items-center justify-center ${selectedDef.bg} ${selectedDef.color}`}>
                {React.cloneElement(selectedDef.icon as React.ReactElement, { size: 12 } as any)}
              </div>
              <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                {dict.fieldValue} <span className="text-destructive">*</span>
              </Label>
            </div>
            <div className="mt-1">
              {selectedType === "text" && (
                <TextField label="" value={fieldValue as string} onChange={setFieldValue} placeholder={dict.textPlaceholder} />
              )}
              {selectedType === "text-description" && (
                <LongTextField label="" value={fieldValue as string} onChange={setFieldValue} placeholder={dict.textPlaceholder} />
              )}
              {selectedType === "image" && (
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
              {selectedType === "video" && (
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
              {selectedType === "video-youtube" && (
                <UrlField label="" value={fieldValue as string} onChange={setFieldValue} placeholder="https://youtube.com/watch?v=..." />
              )}
              {selectedType === "icon" && (
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
              {selectedType === "list" && (
                <ListField
                  label=""
                  value={fieldValue as string[]}
                  onChange={setFieldValue}
                  dict={{ placeholder: dict.listPlaceholder, empty: dict.listEmpty }}
                />
              )}
              {selectedType === "datetime" && (
                <DateTimeField label="" value={fieldValue as string} onChange={setFieldValue} />
              )}
              {selectedType === "url" && (
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
            onClick={handleAdd}
            disabled={!isFormValid}
            className="h-10 px-5 font-semibold bg-primary hover:bg-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed border-none gap-1.5"
          >
            <Check size={14} />
            {dict.add}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
