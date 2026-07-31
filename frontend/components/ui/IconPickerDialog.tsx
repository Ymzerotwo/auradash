"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Plus } from "lucide-react";
import * as LucideIcons from "lucide-react";

/* ─── Lucide Icon List (Categorised for Business/ERP) ──────────────────────── */
const LUCIDE_ICONS = [
  // ── خدمات عامة ونشاط تجاري ──
  "Briefcase", "Building", "Store", "Warehouse", "Factory",
  "Cog", "Settings", "Sliders", "Tool",
  "HardDrive", "Server", "Database", "Cloud", "Terminal",
  "Archive", "Layers", "Grid",

  // ── خدمات السيارات والنقل ──
  "Car", "Truck", "Bus", "Bike", "Navigation",
  "MapPin", "Map", "Route", "Fuel",

  // ── الصحة والجمال والعناية ──
  "HeartPulse", "Activity", "Sparkles", "Droplet",
  "Scissors", "Sun", "Moon", "Flame", "Zap",

  // ── الطعام والشراب والضيافة ──
  "Coffee", "Utensils", "CakeSlice", "Wine", "ChefHat",

  // ── العقارات والبناء والمقاولات ──
  "Building2", "Ruler", "PaintBucket", "Hammer",
  "Drill", "HardHat", "Blueprint", "Palette",

  // ── التعليم والتدريب ──
  "BookOpen", "Book", "Bookmark", "Pen", "PenTool",
  "GraduationCap", "School", "Library",

  // ── المال والمحاسبة والفواتير ──
  "DollarSign", "Euro", "PoundSterling", "TrendingUp",
  "TrendingDown", "PieChart", "BarChart", "Receipt",
  "CreditCard", "Wallet", "Banknote", "Calculator",

  // ── الاتصالات والتسويق والدعم ──
  "Phone", "PhoneCall", "MessageCircle", "MessageSquare",
  "Mail", "Send", "Share2", "Megaphone", "Bell",
  "BellRing", "Headphones", "Headset", "Rss",

  // ── الأمان والحماية ──
  "Shield", "ShieldCheck", "Lock", "Unlock", "Key",
  "Fingerprint", "Eye", "EyeOff", "AlertTriangle", "ShieldAlert",

  // ── إدارة الفريق والعملاء ──
  "Users", "User", "UserPlus", "UserCheck", "UserCog",
  "UserX", "UserCircle", "UserRound", "UserRoundPlus",
  "UserSearch", "Contact", "ContactRound",

  // ── الوقت والمواعيد ──
  "Clock", "AlarmClock", "Calendar", "CalendarCheck",
  "CalendarDays", "CalendarRange", "Timer", "Stopwatch",
  "Hourglass", "Watch",

  // ── الملفات والتقارير ──
  "File", "FileText", "FileSpreadsheet", "FileImage",
  "FilePlus", "Folder", "FolderOpen", "FolderTree",
  "Clipboard", "ClipboardCheck", "ClipboardList",
  "Notebook", "NotebookPen", "NotebookTabs", "NotepadText",

  // ── الوسائط والتصميم ──
  "Image", "Video", "Camera", "Film", "Music",
  "Paintbrush", "Eraser", "Crop",
  "Aperture", "Focus", "Scan", "ScanLine",

  // ── الإنترنت والتكنولوجيا ──
  "Wifi", "Bluetooth", "Monitor", "Smartphone",
  "Tablet", "Laptop", "Printer", "ScanQrCode", "QrCode",
  "Code", "GitBranch", "Rocket", "Cpu", "Chip",

  // ── التجارة الإلكترونية والمخزون ──
  "ShoppingBag", "ShoppingCart", "Package", "Box",
  "Barcode", "Tag", "Tags", "Award", "Gift",
  "Percent", "BadgePercent", "BadgeDollarSign", "BadgeCheck",

  // ── النقل والتوصيل ──
  "PackageCheck", "PackagePlus", "PackageOpen",
  "Plane", "Ship", "Train", "Footprints",

  // ── متنوعة ومفيدة ──
  "Star", "ThumbsUp", "Check", "CheckCircle",
  "CheckSquare", "X", "XCircle", "Info", "HelpCircle",
  "Search", "Plus", "Minus", "List", "ListTodo",
  "Link", "Link2", "ExternalLink", "ArrowUpRight",
  "Download", "Upload", "RefreshCw", "Undo2", "Redo2",
];

import type { LucideProps } from "lucide-react";

/* ─── Lucide Icon renderer (statically imported, no dynamic import) ──────── */
function LucideIcon({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) {
  // Look up the icon from the static import
  const mod = LucideIcons as unknown as Record<string, React.FC<LucideProps>>;
  const IconComponent = mod[name];

  if (!IconComponent) {
    return (
      <div className={`flex items-center justify-center bg-surface-subtle rounded-lg border border-border-default ${className}`}
        style={{ width: size + 8, height: size + 8 }}
        title={name}
      >
        <span className="text-[9px] font-bold text-text-muted uppercase tracking-tight leading-none">
          {name.slice(0, 2)}
        </span>
      </div>
    );
  }

  return <IconComponent size={size} className={className} />;
}

/* ─── Icon Picker Input Component (reusable input field) ─────────────────── */
interface IconPickerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  addIconLabel?: string;
  dir?: "ltr" | "rtl";
  className?: string;
  dict?: Record<string, string>;
}

export function IconPickerInput({
  value,
  onChange,
  placeholder,
  addIconLabel = "Add Icon",
  dir = "ltr",
  className = "",
  dict = {},
}: IconPickerInputProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDialogSelect = (iconName: string) => {
    onChange(iconName);
  };

  const isRtl = dir === "rtl";

  return (
    <div className={`relative w-full ${className}`}>
      {/* ── Input Field ──────────────────────────────────────── */}
      <div className="relative flex items-center w-full group">
        <div className={`absolute ${isRtl ? 'end-0' : 'start-0'} inset-y-0 flex items-center justify-center w-10 text-text-muted pointer-events-none`}>
          {value && <LucideIcon name={value} size={16} className="text-primary" />}
        </div>
        
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || addIconLabel}
          className={`h-10 !rounded-lg text-sm w-full pe-12 transition-all ${isRtl ? (value ? 'pe-10 ps-12' : 'ps-3 pe-12') : (value ? 'ps-10 pe-12' : 'ps-3 pe-12')}`}
          dir="ltr"
        />
        
        <Button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          variant="ghost"
          className={`absolute inset-y-1 ${isRtl ? 'start-1' : 'end-1'} h-8 w-8 p-0 text-text-muted hover:text-blue-500 hover:bg-blue-500/10 transition-colors`}
          title={dict.chooseIcon || "Choose Icon"}
        >
          <Plus size={16} strokeWidth={2.5} />
        </Button>
      </div>

      {/* ── Dialog ──────────────────────────────────────────── */}
      <IconPickerDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSelect={handleDialogSelect}
        currentIcon={value}
        dict={dict}
      />
    </div>
  );
}

/* ─── Props ───────────────────────────────────────────────────────────────── */
interface IconPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (iconName: string) => void;
  currentIcon?: string;
  dict?: Record<string, string>;
}

/* ─── Icon Picker Dialog ──────────────────────────────────────────────────── */
export function IconPickerDialog({
  open,
  onOpenChange,
  onSelect,
  currentIcon,
  dict = {},
}: IconPickerDialogProps) {
  const [search, setSearch] = useState("");

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return LUCIDE_ICONS;
    const q = search.toLowerCase();
    return LUCIDE_ICONS.filter((name) => name.toLowerCase().includes(q));
  }, [search]);

  const handleSelect = useCallback((iconName: string) => {
    onSelect(iconName);
    onOpenChange(false);
    setSearch("");
  }, [onSelect, onOpenChange]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setSearch("");
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className="w-[calc(100vw-2rem)] sm:w-full !max-w-[480px] p-0 overflow-hidden !rounded-2xl bg-surface-card"
        showCloseButton={false}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="relative px-5 pt-5 pb-3">
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

          <DialogHeader className="gap-1 pe-7">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-foreground tracking-tight">
                {dict.title || "Pick an Icon"}
              </DialogTitle>
              <span className="text-[10px] text-text-muted tracking-wider bg-surface-subtle px-2 py-0.5 rounded-md">
                {filteredIcons.length} {dict.iconsCount || "icons"}
              </span>
            </div>
          </DialogHeader>

          <div className="mt-3">
            <Input
              value={search}
              icon={Search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={dict.searchPlaceholder || "Search icons..."}
              className="h-9 !rounded-lg text-sm"
              autoFocus
              endAdornment={
                search && (
                  <button
                    onClick={() => setSearch("")}
                    className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-foreground hover:bg-surface-subtle transition-colors border-none bg-transparent cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )
              }
            />
          </div>
        </div>

        {/* ── Divider ─────────────────────────────────────────── */}
        <div className="h-px bg-border-default" />

        {/* ── Current Selection ──────────────────────────────── */}
        {currentIcon && (
          <div className="px-5 pt-3 pb-1">
            <div className="flex items-center gap-2.5 px-3 py-2 bg-primary/5 border border-primary/20 rounded-xl">
              <LucideIcon name={currentIcon} size={18} className="text-primary" />
              <span className="text-sm font-semibold text-foreground flex-1">{currentIcon}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSelect(currentIcon)}
                className="h-7 px-2.5 text-xs font-semibold text-primary hover:text-primary-foreground hover:bg-primary"
              >
                {dict.select || "Select"}
              </Button>
            </div>
          </div>
        )}

        {/* ── Icon Grid ──────────────────────────────────────── */}
        <div className="px-5 py-3 max-h-[360px] overflow-y-auto">
          {filteredIcons.length === 0 ? (
            <div className="text-sm text-text-muted text-center py-8 bg-surface-subtle rounded-xl border border-border-default border-dashed">
              {dict.noResults || "No icons found."}
            </div>
          ) : (
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5">
              {filteredIcons.map((iconName) => (
                <button
                  key={iconName}
                  onClick={() => handleSelect(iconName)}
                  title={iconName}
                  className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 border cursor-pointer
                    ${currentIcon === iconName
                      ? "bg-primary/10 border-primary text-primary shadow-sm"
                      : "bg-transparent border-transparent text-text-subtle hover:bg-surface-subtle hover:border-border-default hover:text-foreground"
                    }`}
                >
                  <LucideIcon name={iconName} size={16} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pb-3" />
      </DialogContent>
    </Dialog>
  );
}

/* ─── Re-export the dynamic icon renderer for external use ────────────────── */
export { LucideIcon };