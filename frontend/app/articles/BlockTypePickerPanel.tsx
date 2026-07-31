"use client";

import React from "react";
import {
  Type,
  AlignLeft,
  Image as ImageIcon,
  Video,
  PlaySquare,
  Calendar,
  Link2,
  List,
  Smile,
} from "lucide-react";

// ─── Block Type Registry ──────────────────────────────────────────────────────
// Maps 1-to-1 with services.json metadata types and dynamic-fields.tsx components.
export type BlockType =
  | "text-info"
  | "text-description"
  | "photo"
  | "video"
  | "video-youtube"
  | "date_time"
  | "link"
  | "list"
  | "icon";

export interface ContentBlock {
  /** Unique instance ID for this block within the article */
  id: string;
  /** Block type (maps to services.json type field) */
  type: BlockType;
  /** User-defined label for this block (stored as 'label' in meta_data) */
  label: string;
  /** The actual data payload — shape depends on type */
  data: Record<string, unknown>;
}

// ─── Static block type metadata (for rendering the picker) ───────────────────
interface BlockTypeDef {
  type: BlockType;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

export const BLOCK_TYPE_DEFS: BlockTypeDef[] = [
  { type: "text-info",        icon: <Type size={18} />,       color: "text-blue-500",    bg: "bg-blue-500/10"    },
  { type: "text-description", icon: <AlignLeft size={18} />,  color: "text-amber-500",   bg: "bg-amber-500/10"   },
  { type: "photo",            icon: <ImageIcon size={18} />,  color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { type: "video",            icon: <Video size={18} />,      color: "text-purple-500",  bg: "bg-purple-500/10"  },
  { type: "video-youtube",    icon: <PlaySquare size={18} />, color: "text-red-500",     bg: "bg-red-500/10"     },
  { type: "date_time",        icon: <Calendar size={18} />,   color: "text-indigo-500",  bg: "bg-indigo-500/10"  },
  { type: "link",             icon: <Link2 size={18} />,      color: "text-cyan-500",    bg: "bg-cyan-500/10"    },
  { type: "list",             icon: <List size={18} />,       color: "text-orange-500",  bg: "bg-orange-500/10"  },
  { type: "icon",             icon: <Smile size={18} />,      color: "text-pink-500",    bg: "bg-pink-500/10"    },
];

// ─── Labels are provided by caller (i18n dict) ───────────────────────────────
interface BlockTypePickerPanelProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: BlockType) => void;
  dict: {
    pickerTitle: string;
    pickerDesc: string;
    textInfo: string;
    textInfoDesc: string;
    textDescription: string;
    textDescriptionDesc: string;
    photo: string;
    photoDesc: string;
    video: string;
    videoDesc: string;
    videoYoutube: string;
    videoYoutubeDesc: string;
    dateTime: string;
    dateTimeDesc: string;
    link: string;
    linkDesc: string;
    list: string;
    listDesc: string;
    icon: string;
    iconDesc: string;
  };
}

/** Maps a block type to its i18n label + description from the dict. */
function getBlockLabel(
  type: BlockType,
  dict: BlockTypePickerPanelProps["dict"]
): { label: string; desc: string } {
  switch (type) {
    case "text-info":        return { label: dict.textInfo,        desc: dict.textInfoDesc };
    case "text-description": return { label: dict.textDescription, desc: dict.textDescriptionDesc };
    case "photo":            return { label: dict.photo,           desc: dict.photoDesc };
    case "video":            return { label: dict.video,           desc: dict.videoDesc };
    case "video-youtube":    return { label: dict.videoYoutube,    desc: dict.videoYoutubeDesc };
    case "date_time":        return { label: dict.dateTime,        desc: dict.dateTimeDesc };
    case "link":             return { label: dict.link,            desc: dict.linkDesc };
    case "list":             return { label: dict.list,            desc: dict.listDesc };
    case "icon":             return { label: dict.icon,            desc: dict.iconDesc };
  }
}

/**
 * Slide-in panel from the bottom (mobile) / right (desktop) showing all 9
 * block types as clickable visual cards.  Parent is responsible for controlling
 * `open` state; the panel just calls `onSelect` and `onClose`.
 */
export function BlockTypePickerPanel({
  open,
  onClose,
  onSelect,
  dict,
}: BlockTypePickerPanelProps) {
  if (!open) return null;

  const handleSelect = (type: BlockType) => {
    onSelect(type);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered Wrapper for Desktop / Bottom on Mobile */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none p-0 sm:p-4">
        <div className="w-full sm:w-[400px] pointer-events-auto bg-surface-card border border-border-default rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
          {/* Header */}
          <div className="relative px-5 pt-5 pb-4 border-b border-border-default">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight">{dict.pickerTitle}</h3>
                <p className="text-xs text-text-muted mt-0.5">{dict.pickerDesc}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="dialog-close-btn shrink-0"
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Grid of block type cards */}
          <div className="p-4 grid grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto">
            {BLOCK_TYPE_DEFS.map((def) => {
              const { label, desc } = getBlockLabel(def.type, dict);
              return (
                <button
                  key={def.type}
                  type="button"
                  onClick={() => handleSelect(def.type)}
                  className="group flex flex-col items-center gap-2 p-3 bg-transparent border border-border-default hover:border-primary/50 rounded-xl transition-all duration-150 cursor-pointer outline-none text-center"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${def.bg} ${def.color} transition-transform duration-150 group-hover:scale-110`}>
                    {def.icon}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold text-foreground leading-tight">{label}</span>
                    <span className="text-[10px] text-text-muted leading-tight hidden sm:block">{desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
