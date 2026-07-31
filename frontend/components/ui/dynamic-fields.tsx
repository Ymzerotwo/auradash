import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Video as VideoIcon, Trash2, Link2, Plus, X, AlertCircle } from "lucide-react";
import { MediaPickerDialog } from "@/components/ui/MediaPickerDialog";
import { type MediaPickerItem } from "@/lib/hooks/useMedia";
import { IconPickerDialog, LucideIcon } from "@/components/ui/IconPickerDialog";

interface BaseFieldProps {
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  error?: string;
}

export interface TextFieldProps extends BaseFieldProps {
  value: string;
  onChange: (val: string) => void;
  dir?: "ltr" | "rtl" | "auto";
}

export function TextField({ label, value, onChange, placeholder, required, dir, error }: TextFieldProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <Label className="text-xs font-medium text-text-subtle">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        className="h-10 text-sm w-full"
        error={error}
      />
    </div>
  );
}

export interface LongTextFieldProps extends BaseFieldProps {
  value: string;
  onChange: (val: string) => void;
  dir?: "ltr" | "rtl" | "auto";
}

export function LongTextField({ label, value, onChange, placeholder, required, dir, error }: LongTextFieldProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full relative">
      {label && (
        <Label className="text-xs font-medium text-text-subtle">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        error={error}
      />
    </div>
  );
}

export interface MediaFieldProps extends BaseFieldProps {
  value: string;
  onChange: (val: string) => void;
  type: "image" | "video";
  dict?: {
    chooseImage?: string;
    chooseVideo?: string;
  };
}

export function MediaField({ label, value, onChange, type, required, dict = {}, error }: MediaFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isImage = type === "image";

  let displayName = "";
  if (value) {
    try {
      const urlObj = new URL(value, value.startsWith('http') ? undefined : 'http://localhost');
      displayName = urlObj.searchParams.get("name") || "";
    } catch { }
    if (!displayName) {
      const pathPart = value.split('?')[0];
      displayName = pathPart.split('/').pop()?.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, '') || '';
    }
  }

  return (
    <div className="flex flex-col gap-1.5 w-full relative">
      {label && (
        <Label className="text-xs font-medium text-text-subtle">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {value ? (
        <div className={`flex items-center gap-3 p-2.5 bg-surface-subtle/50 border ${error ? 'border-destructive' : 'border-border-default'} rounded-xl`}>
          <div className="w-12 h-12 rounded-lg bg-surface-subtle border border-border-default overflow-hidden flex items-center justify-center shrink-0">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="w-full h-full object-cover" />
            ) : (
              <video src={value} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs font-bold text-foreground truncate" dir="ltr">{displayName || value}</span>
            <span className="text-[10px] text-text-muted">{isImage ? "Image" : "Video"}</span>
          </div>
          <div className="flex items-center gap-3 pe-2">
            <button type="button" onClick={() => setIsOpen(true)} className="text-xs font-bold text-text-muted hover:text-foreground transition-colors cursor-pointer outline-none">
              Change
            </button>
            <button type="button" onClick={() => onChange("")} className="text-text-muted hover:text-destructive transition-colors cursor-pointer outline-none">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ) : (
        <Button 
          type="button"
          variant="outline"
          onClick={() => setIsOpen(true)}
          className={`w-full h-24 border-dashed border-2 flex flex-row gap-2 items-center justify-center rounded-xl cursor-pointer transition-all duration-300 ${
            error 
              ? 'border-destructive/50 hover:border-destructive text-destructive' 
              : 'border-border-default bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:hover:bg-input/50'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${error ? 'bg-destructive/10 text-destructive' : 'bg-surface-subtle text-text-muted'}`}>
            {isImage ? <ImageIcon size={20} /> : <VideoIcon size={20} />}
          </div>
          <span className="text-xs font-medium text-text-subtle">
            {isImage ? (dict.chooseImage || "Choose Image") : (dict.chooseVideo || "Choose Video")}
          </span>
        </Button>
      )}
      {error && (
        <span className="flex items-center gap-1.5 mt-1.5 start-0.5 text-[12px] text-destructive font-medium leading-tight animate-in fade-in-50 duration-200">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 opacity-90" />
          <span>{error}</span>
        </span>
      )}
      <MediaPickerDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        type={type}
        onSelect={(item: MediaPickerItem) => {
          const urlObj = new URL(item.url, item.url.startsWith('http') ? undefined : 'http://localhost');
          urlObj.searchParams.set("name", item.name);
          onChange(item.url.startsWith('http') ? urlObj.toString() : urlObj.pathname + urlObj.search);
          setIsOpen(false);
        }}
      />
    </div>
  );
}

export interface IconFieldProps extends BaseFieldProps {
  value: string;
  onChange: (val: string) => void;
  dict?: {
    chooseIcon?: string;
    changeIcon?: string;
    pickIcon?: string;
    searchPlaceholder?: string;
    select?: string;
    close?: string;
    noResults?: string;
  };
}

export function IconField({ label, value, onChange, required, dict = {}, error }: IconFieldProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <Label className="text-xs font-medium text-text-subtle">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="e.g. lucide-home, fas fa-user..."
              className="h-10 !rounded-lg text-sm w-full pe-24"
              dir="ltr"
              error={error}
              icon={value ? () => <LucideIcon name={value} size={16} className="text-primary" /> : undefined}
            />
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="absolute inset-y-1 end-1 h-8 px-3 flex items-center justify-center text-xs font-bold text-text-muted hover:text-foreground transition-colors cursor-pointer outline-none"
            >
              {dict.chooseIcon || "Choose Icon"}
            </button>
          </div>
        </div>
      </div>

      <IconPickerDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        onSelect={(iconName: string) => onChange(iconName)}
        currentIcon={value}
        dict={{
          title: dict.pickIcon || "Pick an Icon",
          searchPlaceholder: dict.searchPlaceholder || "Search icons...",
          select: dict.select || "Select",
          close: dict.close || "Close",
          noResults: dict.noResults || "No icons found.",
          iconsCount: "",
        }}
      />
    </div>
  );
}

export interface UrlFieldProps extends BaseFieldProps {
  value: string;
  onChange: (val: string) => void;
}

export function UrlField({ label, value, onChange, placeholder, required, error }: UrlFieldProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <Label className="text-xs font-medium text-text-subtle">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        type="url"
        icon={Link2}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "https://..."}
        className="h-10 !rounded-lg text-sm w-full"
        dir="ltr"
        error={error}
      />
    </div>
  );
}

export interface ListFieldProps extends BaseFieldProps {
  value: string[];
  onChange: (val: string[]) => void;
  dict?: {
    placeholder?: string;
    add?: string;
    empty?: string;
  };
}

export function ListField({ label, value = [], onChange, placeholder, required, dict = {}, error }: ListFieldProps) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    if (!inputValue.trim()) return;
    onChange([...(value || []), inputValue.trim()]);
    setInputValue("");
  };

  const handleRemove = (index: number) => {
    const newValues = [...value];
    newValues.splice(index, 1);
    onChange(newValues);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <Label className="text-xs font-medium text-text-subtle">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={placeholder || dict.placeholder || "Type an item and press Enter"}
          className="h-10 !rounded-lg text-sm w-full"
          error={error}
        />
        <Button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className="h-10 px-3 shrink-0 !rounded-lg"
          variant="secondary"
        >
          <Plus size={16} />
        </Button>
      </div>
      {(value?.length || 0) > 0 ? (
        <div className="flex flex-wrap gap-2 mt-1">
          {value.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-subtle border border-border-default rounded-md text-sm font-medium">
              <span>{item}</span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="text-text-muted hover:text-destructive cursor-pointer transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-[11px] text-text-muted mt-1">{dict.empty || "No items added yet."}</span>
      )}
    </div>
  );
}

export interface DateTimeFieldProps extends BaseFieldProps {
  value: string; // ISO string
  onChange: (val: string) => void;
}

export function DateTimeField({ label, value, onChange, required, error }: DateTimeFieldProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <Label className="text-xs font-medium text-text-subtle">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <Input
        type="datetime-local"
        value={value ? new Date(value).toISOString().slice(0, 16) : ""}
        onChange={(e) => {
          if (e.target.value) {
            onChange(new Date(e.target.value).toISOString());
          } else {
            onChange("");
          }
        }}
        className="h-10 !rounded-lg text-sm w-full text-start"
        dir="ltr"
        error={error}
      />
    </div>
  );
}
