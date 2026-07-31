"use client";

import React, { useState, useCallback, useRef, useId, useEffect } from "react";
import Image from "next/image";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, Upload, X, Plus, MapPin, Clock, Globe,
  Phone, Mail, MessageCircle, Trash2, GripVertical,
  Save
} from "lucide-react";
import { 
  FaFacebook, FaInstagram, FaXTwitter, FaLinkedin, FaTiktok, FaYoutube, FaSnapchat, 
  FaTelegram, FaPinterest, FaThreads 
} from "react-icons/fa6";
import { 
  useWorkspacePageState,
  type LocationEntry,
  type DaySchedule,
  type WeekSchedule
} from "@/lib/hooks/useGeneralSettings";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { WorkspaceService } from "@/lib/services/general-settings.service";

/* ─── Types ────────────────────────────────────────── */

/* ─── Section Card ─────────────────────────────────────────── */
function SectionCard({ icon: Icon, title, description, children }: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl backdrop-blur-md transition-all duration-200 overflow-hidden">
      <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-border-subtle flex items-start gap-3 sm:gap-4">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
          <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
        </div>
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm sm:text-[15px] font-semibold text-foreground m-0">{title}</h3>
          <p className="text-[11px] sm:text-xs text-text-muted m-0">{description}</p>
        </div>
      </div>
      <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-5">{children}</div>
    </div>
  );
}

function FormField({ label, hint, children, id, error }: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  id?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2 group pb-3">
      <Label htmlFor={id} className={error ? "text-destructive transition-colors duration-200" : ""}>{label}</Label>
      {children}
      {hint && !error && <span className="text-[11px] text-text-subtle">{hint}</span>}
    </div>
  );
}

function IconInput({ id, value, onChange, placeholder, type = "text", icon: Icon, error }: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ElementType;
  error?: string;
}) {
  return (
    <Input
      id={id}
      type={type}
      value={value}
      icon={Icon}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      error={error}
      className="h-10 text-sm"
    />
  );
}

function SocialRow({ icon: Icon, label, value, onChange, placeholder, color, error }: {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  color: string;
  error?: string;
}) {
  return (
    <div className="flex items-center gap-3 pb-3">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white")} style={{ background: color }}>
        <Icon size={18} />
      </div>
      <div className="flex-1">
        <Input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          error={error}
          className="h-10 text-sm"
        />
      </div>
    </div>
  );
}

function getEmbedUrl(mapUrl: string): string | null {
  if (!mapUrl) return null;

  try {
    const url = mapUrl.trim();

    // 1. If it's already an embed URL (e.g. from an iframe embed code copy-pasted), return it directly
    if (url.includes("/maps/embed") || url.includes("output=embed")) {
      const match = url.match(/src="([^"]+)"/);
      return match ? match[1] : url;
    }

    // 2. Handle standard google.com/maps or maps.app.goo.gl links
    if (
      url.includes("google.com/maps") ||
      url.includes("maps.google.com") ||
      url.includes("maps.app.goo.gl") ||
      url.includes("goo.gl/maps")
    ) {
      // Try to extract place name
      const placeMatch = url.match(/\/maps\/place\/([^/]+)/);
      if (placeMatch && placeMatch[1]) {
        return `https://maps.google.com/maps?q=${placeMatch[1]}&z=15&output=embed`;
      }

      // Try to extract search query
      const searchMatch = url.match(/\/maps\/search\/([^/]+)/);
      if (searchMatch && searchMatch[1]) {
        return `https://maps.google.com/maps?q=${searchMatch[1]}&z=15&output=embed`;
      }

      // Try to extract coordinates
      const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch && coordMatch[1] && coordMatch[2]) {
        return `https://maps.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&z=15&output=embed`;
      }

      // Fallback for shortened or other formats: pass the entire URL as query
      return `https://maps.google.com/maps?q=${encodeURIComponent(url)}&z=15&output=embed`;
    }

    return null;
  } catch (e) {
    console.error("Error parsing maps URL:", e);
    return null;
  }
}

function LocationCard({ location, index, t, onChange, onRemove, errors = {} }: {
  location: LocationEntry;
  index: number;
  t: Dictionary;
  onChange: (id: string, field: keyof LocationEntry, value: string) => void;
  onRemove: (id: string) => void;
  errors?: Record<string, string>;
}) {
  const loc = t.workspace.location;
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    let active = true;
    const url = location.mapUrl?.trim();
    if (!url) {
      setResolvedUrl(null);
      return;
    }

    if (url.includes("maps.app.goo.gl") || url.includes("goo.gl/maps")) {
      setResolving(true);
      WorkspaceService.resolveMap(url)
        .then((res: string) => {
          if (active) setResolvedUrl(res);
        })
        .catch((err: unknown) => {
          console.error("Failed to resolve map URL:", err);
          if (active) setResolvedUrl(url); // fallback
        })
        .finally(() => {
          if (active) setResolving(false);
        });
    } else {
      setResolvedUrl(url);
      setResolving(false);
    }

    return () => {
      active = false;
    };
  }, [location.mapUrl]);

  return (
    <div className="border border-border-default rounded-xl p-4 sm:p-5 bg-surface-subtle/50 flex flex-col gap-3 sm:gap-4 relative group transition-all duration-200 hover:border-border-strong">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <GripVertical size={14} className="text-text-subtle" />
          <MapPin size={14} className="text-primary" />
          <span>{loc.locationLabel} #{index + 1}</span>
        </div>
        <button
          type="button"
          onClick={() => onRemove(location.id)}
          className="flex items-center gap-1.5 text-xs text-danger bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:underline"
        >
          <Trash2 size={12} />
          {loc.removeLocation}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label={loc.locationLabel} id={`loc-label-${location.id}`} error={errors.label}>
          <IconInput id={`loc-label-${location.id}`} value={location.label} onChange={(v) => onChange(location.id, "label", v)} placeholder={loc.locationLabelPlaceholder} error={errors.label} />
        </FormField>
        <FormField label={loc.address} id={`loc-addr-${location.id}`} error={errors.address}>
          <IconInput id={`loc-addr-${location.id}`} value={location.address} onChange={(v) => onChange(location.id, "address", v)} placeholder={loc.addressPlaceholder} error={errors.address} />
        </FormField>
        <FormField label={loc.city} id={`loc-city-${location.id}`} error={errors.city}>
          <IconInput id={`loc-city-${location.id}`} value={location.city} onChange={(v) => onChange(location.id, "city", v)} placeholder={loc.cityPlaceholder} error={errors.city} />
        </FormField>
        <FormField label={loc.country} id={`loc-country-${location.id}`} error={errors.country}>
          <IconInput id={`loc-country-${location.id}`} value={location.country} onChange={(v) => onChange(location.id, "country", v)} placeholder={loc.countryPlaceholder} error={errors.country} />
        </FormField>
      </div>
      <FormField label={loc.mapUrl} hint={loc.mapHint} id={`loc-map-${location.id}`} error={errors.mapUrl}>
        <IconInput 
          id={`loc-map-${location.id}`} 
          value={location.mapUrl} 
          onChange={(v) => {
            let cleanedValue = v.trim();
            // Clean iframe html pasted by mistake
            if (cleanedValue.startsWith("<iframe")) {
              const srcMatch = cleanedValue.match(/src="([^"]+)"/);
              if (srcMatch && srcMatch[1]) {
                cleanedValue = srcMatch[1];
              }
            }
            onChange(location.id, "mapUrl", cleanedValue);
          }} 
          placeholder={loc.mapUrlPlaceholder} 
          icon={Globe} 
          error={errors.mapUrl} 
        />
      </FormField>
      {location.mapUrl && !resolving && resolvedUrl && getEmbedUrl(resolvedUrl) && (
        <div className="w-full h-48 rounded-lg overflow-hidden border border-border-default">
          <iframe
            src={getEmbedUrl(resolvedUrl) || ""}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Map - ${location.label}`}
          />
        </div>
      )}
      {resolving && (
        <div className="w-full h-48 rounded-lg border border-border-default flex items-center justify-center bg-surface-subtle/30">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}

/* ─── Working Hours Row ────────────────────────────────────── */
function HoursRow({ dayKey, dayLabel, schedule, onChange }: {
  dayKey: string;
  dayLabel: string;
  schedule: DaySchedule;
  onChange: (day: string, field: keyof DaySchedule, value: string | boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {/* ── Desktop Row (md+) ── */}
      <div className={cn(
        "hidden md:grid grid-cols-[1fr_120px_120px_100px] gap-3 items-center py-3 px-3 rounded-lg transition-colors duration-150",
        schedule.closed ? "bg-danger/5" : "hover:bg-surface-subtle"
      )}>
        <span className={cn("text-sm font-medium", schedule.closed ? "text-text-subtle line-through" : "text-foreground")}>{dayLabel}</span>
        <input
          type="time"
          value={schedule.open || ""}
          onChange={(e) => onChange(dayKey, "open", e.target.value)}
          disabled={schedule.closed}
          className="h-8 rounded-md border border-border-default bg-surface-subtle text-foreground text-xs px-2 text-center outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <input
          type="time"
          value={schedule.close || ""}
          onChange={(e) => onChange(dayKey, "close", e.target.value)}
          disabled={schedule.closed}
          className="h-8 rounded-md border border-border-default bg-surface-subtle text-foreground text-xs px-2 text-center outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <label className="flex items-center justify-center gap-2 cursor-pointer select-none">
          <Switch
            checked={schedule.closed}
            onCheckedChange={(val: boolean) => onChange(dayKey, "closed", val)}
          />
          <span className="text-xs text-text-muted">
            {schedule.closed ? t.common.status.closed : t.common.status.open}
          </span>
        </label>
      </div>

      {/* ── Mobile Card (below md) ── */}
      <div className={cn(
        "flex md:hidden flex-col gap-2 p-3 rounded-lg transition-colors duration-150",
        schedule.closed ? "bg-danger/5" : "hover:bg-surface-subtle"
      )}>
        <div className="flex items-center justify-between gap-2 min-w-[310px]">
          <span className={cn("text-sm font-medium w-20 shrink-0", schedule.closed ? "text-text-subtle line-through" : "text-foreground")}>{dayLabel}</span>
          
          {!schedule.closed ? (
            <div className="flex flex-1 items-center justify-center gap-1.5 px-1 sm:px-2">
              <input
                type="time"
                value={schedule.open || ""}
                onChange={(e) => onChange(dayKey, "open", e.target.value)}
                className="flex-1 w-full max-w-[110px] h-8 rounded-md border border-border-default bg-surface-subtle text-foreground text-xs px-1 sm:px-2 text-center outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
              <span className="text-[10px] text-text-muted shrink-0">→</span>
              <input
                type="time"
                value={schedule.close || ""}
                onChange={(e) => onChange(dayKey, "close", e.target.value)}
                className="flex-1 w-full max-w-[110px] h-8 rounded-md border border-border-default bg-surface-subtle text-foreground text-xs px-1 sm:px-2 text-center outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
          ) : (
            <div className="flex-1 flex justify-center">
              <span className="text-xs text-text-muted italic">{t.common.status.closed}</span>
            </div>
          )}

          <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
            <Switch
              checked={schedule.closed}
              onCheckedChange={(val: boolean) => onChange(dayKey, "closed", val)}
              className="scale-90"
            />
          </label>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Workspace Page
   ═══════════════════════════════════════════════════════════════ */

/* ─── Skeleton Loading Components ─────────────────────────── */
function IdentitySkeleton() {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden animate-pulse">
      <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-border-subtle flex items-start gap-3 sm:gap-4">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-surface-subtle flex items-center justify-center shrink-0 text-text-muted/30">
          <Building2 className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 sm:h-4 w-28 sm:w-32 rounded-md" />
          <Skeleton className="h-3 w-48 sm:w-64 max-w-full rounded-md" />
        </div>
      </div>
      <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-20 rounded-md" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-24 rounded-md" />
          <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-border-default bg-surface-subtle/10">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="h-3.5 w-44 rounded-md" />
          </div>
        </div>
        <div className="flex justify-end pt-3 border-t border-border-subtle">
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function ContactSkeleton() {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden animate-pulse">
      <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-border-subtle flex items-start gap-3 sm:gap-4">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-surface-subtle flex items-center justify-center shrink-0 text-text-muted/30">
          <Phone className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 sm:h-4 w-32 sm:w-36 rounded-md" />
          <Skeleton className="h-3 w-56 sm:w-72 max-w-full rounded-md" />
        </div>
      </div>
      <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-28 rounded-md" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-28 rounded-md" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-24 rounded-md" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="flex justify-end pt-3 border-t border-border-subtle">
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function SocialSkeleton() {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden animate-pulse">
      <div className="px-6 py-5 border-b border-border-subtle flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-surface-subtle flex items-center justify-center shrink-0 text-text-muted/30">
          <Globe size={20} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-3 w-64 max-w-full rounded-md" />
        </div>
      </div>
      <div className="p-6 flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-3 pb-3">
              <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
              <Skeleton className="h-10 flex-1 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-3 border-t border-border-subtle">
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function LocationsSkeleton() {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden animate-pulse">
      <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-border-subtle flex items-start gap-3 sm:gap-4">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-surface-subtle flex items-center justify-center shrink-0 text-text-muted/30">
          <MapPin className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 sm:h-4 w-24 sm:w-28 rounded-md" />
          <Skeleton className="h-3 w-48 sm:w-64 max-w-full rounded-md" />
        </div>
      </div>
      <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-5">
        <div className="border border-border-default rounded-xl p-4 sm:p-5 bg-surface-subtle/20 flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-28 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-16 rounded-md" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <Skeleton className="w-full h-48 rounded-lg" />
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-border-subtle">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function WorkingHoursSkeleton() {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden animate-pulse">
      <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-border-subtle flex items-start gap-3 sm:gap-4">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-surface-subtle flex items-center justify-center shrink-0 text-text-muted/30">
          <Clock className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 sm:h-4 w-28 sm:w-32 rounded-md" />
          <Skeleton className="h-3 w-48 sm:w-64 max-w-full rounded-md" />
        </div>
      </div>
      <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-5">
        <div className="hidden md:grid grid-cols-[1fr_120px_120px_100px] gap-3 px-3 pb-2 border-b border-border-subtle">
          <Skeleton className="h-3.5 w-12 rounded" />
          <Skeleton className="h-3.5 w-12 mx-auto rounded" />
          <Skeleton className="h-3.5 w-12 mx-auto rounded" />
          <Skeleton className="h-3.5 w-12 mx-auto rounded" />
        </div>
        <div className="flex flex-col gap-1">
          {Array.from({ length: 7 }).map((_, idx) => (
            <div key={idx} className="hidden md:grid grid-cols-[1fr_120px_120px_100px] gap-3 items-center py-3 px-3">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-8 w-24 mx-auto rounded-md" />
              <Skeleton className="h-8 w-24 mx-auto rounded-md" />
              <div className="flex justify-center">
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
          ))}
          {Array.from({ length: 7 }).map((_, idx) => (
            <div key={idx} className="flex md:hidden flex-col gap-2 p-3 border-b border-border-subtle last:border-0">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 flex-1 rounded-md" />
                <Skeleton className="h-3.5 w-4 rounded" />
                <Skeleton className="h-9 flex-1 rounded-md" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-3 border-t border-border-subtle">
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  const { t } = useTranslation();
  const ws = t.workspace;

  const {
    siteName, setSiteName,
    logoPreview, setLogoPreview,
    whatsapp, setWhatsapp,
    phone, setPhone,
    email, setEmail,
    uploadingLogo,
    fileRef,
    social,
    locations,
    schedule,
    errors,
    savingIdentity, savingContact, savingSocial, savingLocations, savingWorkingHours,
    isIdentityChanged, isContactChanged, isSocialChanged, isLocationsChanged, isWorkingHoursChanged,
    isSettingsLoading,
    isForbidden,
    handleLogoChange,
    handleLogoUpload,
    handleSocialChange,
    handleLocationChange,
    addLocation,
    removeLocation,
    handleScheduleChange,
    handleSaveIdentity,
    handleSaveContact,
    handleSaveSocial,
    handleSaveLocations,
    handleSaveWorkingHours,
  } = useWorkspacePageState();

  // ── Render ─────────────────────────────────────────────────
  if (isForbidden) {
    return (
      <DashboardLayout pageTitle={ws.pageTitle || "Workspace"}>
         <PermissionDenied />
      </DashboardLayout>
    );
  }

  if (isSettingsLoading) {
    return (
      <DashboardLayout pageTitle={ws.pageTitle}>
        <div className="flex flex-col gap-6 w-full max-w-[900px] mx-auto">
          <div className="text-center flex flex-col items-center gap-2">
            <Skeleton className="h-7 w-52 rounded-md" />
            <Skeleton className="h-4 w-80 max-w-full rounded-md" />
          </div>

          <IdentitySkeleton />
          <ContactSkeleton />
          <SocialSkeleton />
          <LocationsSkeleton />
          <WorkingHoursSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle={ws.pageTitle}>
      <div className="flex flex-col gap-6 w-full max-w-[900px] mx-auto">

        {/* Page Header */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground m-0 mb-1">{ws.pageTitle}</h2>
        </div>

        {/* ── 1. Business Identity ─────────────────────────── */}
        <SectionCard icon={Building2} title={ws.sections.identity} description={ws.sections.identityDesc}>
          <FormField label={ws.fields.siteName} hint={ws.fields.siteNameHint} id="site-name" error={errors.siteName}>
            <IconInput id="site-name" value={siteName} onChange={setSiteName} placeholder={ws.fields.siteNamePlaceholder} icon={Building2} error={errors.siteName} />
          </FormField>

          <FormField label={ws.fields.logo} hint={ws.fields.logoHint}>
            <div
              className={cn(
                "relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-border-default bg-surface-subtle/50 cursor-pointer transition-all duration-200",
                "hover:border-primary/50 hover:bg-primary/5"
              )}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "bg-primary/5"); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary", "bg-primary/5"); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                const file = e.dataTransfer.files[0];
                if (file) handleLogoUpload(file);
              }}
            >
              {uploadingLogo && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-xl">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs mt-2 font-medium">{t.common.upload.uploading}</span>
                </div>
              )}
              {logoPreview ? (
                <div className="relative">
                  <Image src={logoPreview} alt="Logo preview" width={96} height={96} className="w-24 h-24 rounded-xl object-contain border border-border-default bg-white" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setLogoPreview(null); }}
                    className="absolute -top-2 -end-2 w-6 h-6 rounded-full bg-danger text-white flex items-center justify-center border-2 border-surface-raised cursor-pointer hover:scale-110 transition-transform"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Upload size={22} />
                  </div>
                  <span className="text-sm text-text-muted">{ws.fields.logoUpload}</span>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleLogoChange} />
            </div>
          </FormField>

          <div className="flex justify-end pt-3 border-t border-border-subtle">
            <Button size="sm" onClick={handleSaveIdentity} disabled={savingIdentity || uploadingLogo || !siteName.trim() || !isIdentityChanged} className="w-full sm:w-auto">
              <Save size={15} />
              {savingIdentity ? ws.actions.saving : ws.actions.save}
            </Button>
          </div>
        </SectionCard>

        {/* ── 2. Contact Information ───────────────────────── */}
        <SectionCard icon={Phone} title={ws.sections.contact} description={ws.sections.contactDesc}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label={ws.fields.whatsapp} hint={ws.fields.whatsappHint} id="whatsapp" error={errors['contactInfo.whatsapp']}>
              <IconInput id="whatsapp" value={whatsapp} onChange={setWhatsapp} placeholder={ws.fields.whatsappPlaceholder} type="tel" icon={MessageCircle} error={errors['contactInfo.whatsapp']} />
            </FormField>
            <FormField label={ws.fields.phone} id="phone" error={errors['contactInfo.phone']}>
              <IconInput id="phone" value={phone} onChange={setPhone} placeholder={ws.fields.phonePlaceholder} type="tel" icon={Phone} error={errors['contactInfo.phone']} />
            </FormField>
          </div>
          <FormField label={ws.fields.email} id="email" error={errors['contactInfo.email']}>
            <IconInput id="email" value={email} onChange={setEmail} placeholder={ws.fields.emailPlaceholder} type="email" icon={Mail} error={errors['contactInfo.email']} />
          </FormField>

          <div className="flex justify-end pt-3 border-t border-border-subtle">
            <Button size="sm" onClick={handleSaveContact} disabled={savingContact || !isContactChanged} className="w-full sm:w-auto">
              <Save size={15} />
              {savingContact ? ws.actions.saving : ws.actions.save}
            </Button>
          </div>
        </SectionCard>

        {/* ── 3. Social Media ─────────────────────────────── */}
        <SectionCard icon={Globe} title={ws.sections.social} description={ws.sections.socialDesc}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SocialRow icon={FaFacebook} label={ws.fields.facebook} value={social.facebook} onChange={(v) => handleSocialChange("facebook", v)} placeholder={ws.fields.facebookPlaceholder} color="#1877f2" error={errors['socialMedia.facebook']} />
            <SocialRow icon={FaInstagram} label={ws.fields.instagram} value={social.instagram} onChange={(v) => handleSocialChange("instagram", v)} placeholder={ws.fields.instagramPlaceholder} color="#e4405f" error={errors['socialMedia.instagram']} />
            <SocialRow icon={FaXTwitter} label={ws.fields.twitter} value={social.twitter} onChange={(v) => handleSocialChange("twitter", v)} placeholder={ws.fields.twitterPlaceholder} color="#000000" error={errors['socialMedia.twitter']} />
            <SocialRow icon={FaLinkedin} label={ws.fields.linkedin} value={social.linkedin} onChange={(v) => handleSocialChange("linkedin", v)} placeholder={ws.fields.linkedinPlaceholder} color="#0a66c2" error={errors['socialMedia.linkedin']} />
            <SocialRow icon={FaTiktok} label={ws.fields.tiktok} value={social.tiktok} onChange={(v) => handleSocialChange("tiktok", v)} placeholder={ws.fields.tiktokPlaceholder} color="#010101" error={errors['socialMedia.tiktok']} />
            <SocialRow icon={FaYoutube} label={ws.fields.youtube} value={social.youtube} onChange={(v) => handleSocialChange("youtube", v)} placeholder={ws.fields.youtubePlaceholder} color="#ff0000" error={errors['socialMedia.youtube']} />
            <SocialRow icon={FaSnapchat} label={ws.fields.snapchat} value={social.snapchat} onChange={(v) => handleSocialChange("snapchat", v)} placeholder={ws.fields.snapchatPlaceholder} color="#fffc00" error={errors['socialMedia.snapchat']} />
            <SocialRow icon={FaTelegram} label={ws.fields.telegram || "Telegram"} value={social.telegram} onChange={(v) => handleSocialChange("telegram", v)} placeholder={ws.fields.telegramPlaceholder || ""} color="#0088cc" error={errors['socialMedia.telegram']} />
            <SocialRow icon={FaPinterest} label={ws.fields.pinterest || "Pinterest"} value={social.pinterest} onChange={(v) => handleSocialChange("pinterest", v)} placeholder={ws.fields.pinterestPlaceholder || ""} color="#bd081c" error={errors['socialMedia.pinterest']} />
            <SocialRow icon={FaThreads} label={ws.fields.threads || "Threads"} value={social.threads} onChange={(v) => handleSocialChange("threads", v)} placeholder={ws.fields.threadsPlaceholder || ""} color="#000000" error={errors['socialMedia.threads']} />
          </div>

          <div className="flex justify-end pt-3 border-t border-border-subtle">
            <Button size="sm" onClick={handleSaveSocial} disabled={savingSocial || !isSocialChanged} className="w-full sm:w-auto">
              <Save size={15} />
              {savingSocial ? ws.actions.saving : ws.actions.save}
            </Button>
          </div>
        </SectionCard>

        {/* ── 4. Locations ────────────────────────────────── */}
        <SectionCard icon={MapPin} title={ws.sections.locations} description={ws.sections.locationsDesc}>
          <div className="flex flex-col gap-4">
            {locations.map((loc, i) => {
              const locErrors: Record<string, string> = {};
              Object.keys(errors).forEach(key => {
                if (key.startsWith(`locations.${i}.`)) {
                  locErrors[key.split('.')[2]] = errors[key];
                }
              });
              return (
                <LocationCard key={loc.id} location={loc} index={i} t={t} onChange={handleLocationChange} onRemove={removeLocation} errors={locErrors} />
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-3 border-t border-border-subtle">
            <button
              type="button"
              onClick={addLocation}
              className="flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto text-sm font-medium text-primary bg-primary/10 border border-primary/20 rounded-lg px-4 py-2 cursor-pointer transition-all duration-200 hover:bg-primary/20 hover:border-primary/30"
            >
              <Plus size={16} />
              {ws.location.addLocation}
            </button>
            <Button size="sm" onClick={handleSaveLocations} disabled={savingLocations || !isLocationsChanged} className="w-full sm:w-auto">
              <Save size={15} />
              {savingLocations ? ws.actions.saving : ws.actions.save}
            </Button>
          </div>
        </SectionCard>

        {/* ── 5. Working Hours ────────────────────────────── */}
        <SectionCard icon={Clock} title={ws.sections.workingHours} description={ws.sections.workingHoursDesc}>
          <div className="hidden md:grid grid-cols-[1fr_120px_120px_100px] gap-3 px-3 pb-2 text-[11px] font-semibold text-text-subtle uppercase tracking-wide border-b border-border-subtle">
            <span>{ws.hours.day}</span>
            <span className="text-center">{ws.hours.open}</span>
            <span className="text-center">{ws.hours.close}</span>
            <span className="text-center">{ws.hours.status}</span>
          </div>
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
            <div className="flex flex-col gap-0.5 min-w-max sm:min-w-0">
              {Object.entries(ws.hours.days).map(([key, label]) => (
                <HoursRow
                  key={key}
                  dayKey={key}
                  dayLabel={label as string}
                  schedule={schedule[key] || { open: "09:00", close: "17:00", closed: true }}
                  onChange={handleScheduleChange}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-border-subtle">
            <Button size="sm" onClick={handleSaveWorkingHours} disabled={savingWorkingHours || !isWorkingHoursChanged} className="w-full sm:w-auto">
              <Save size={15} />
              {savingWorkingHours ? ws.actions.saving : ws.actions.save}
            </Button>
          </div>
        </SectionCard>
      </div>
    </DashboardLayout>
  );
}
