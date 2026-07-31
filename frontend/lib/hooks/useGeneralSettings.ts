import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  WorkspaceService, 
  type WorkspaceSettingsPayload,
  type WorkspaceIdentityPayload,
  type WorkspaceContactPayload,
  type WorkspaceSocialPayload,
  type WorkspaceLocationsPayload,
  type WorkspaceWorkingHoursPayload
} from '../services/general-settings.service';
import { ApiError } from '../api/client';
import { toast } from 'sonner';
import { getErrorMessage, getSuccessMessage, extractApiErrors } from '../utils/error';
import { useTranslation } from '../i18n/LanguageContext';
import { 
  identitySchema,
  contactSchema,
  socialSchema,
  locationsSchema,
  workingHoursSchema
} from "../validations/workspace.schema";
import { extractZodErrors } from "../validations/common.schema";

/* ─── Query Keys ──────────────────────────────────────────── */
export const workspaceKeys = {
  all: ['workspace'] as const,
  settings: () => [...workspaceKeys.all, 'settings'] as const,
};

/* ─── Hooks ───────────────────────────────────────────────── */

/** Fetch workspace settings */
export function useWorkspaceSettings() {
  return useQuery<WorkspaceSettingsPayload, ApiError>({
    queryKey: workspaceKeys.settings(),
    queryFn: () => WorkspaceService.getSettings(),
  });
}

/** Save brand identity settings */
export function useSaveWorkspaceIdentity() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (settings: WorkspaceIdentityPayload) =>
      WorkspaceService.updateIdentity(settings),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workspaceKeys.all });
      toast.success(getSuccessMessage({ slug: 'WORKSPACE_UPDATED' }, t as any, 'workspace'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'workspace'));
    },
  });
}

/** Save contact settings */
export function useSaveWorkspaceContact() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (settings: WorkspaceContactPayload) =>
      WorkspaceService.updateContact(settings),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workspaceKeys.all });
      toast.success(getSuccessMessage({ slug: 'WORKSPACE_UPDATED' }, t as any, 'workspace'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'workspace'));
    },
  });
}

/** Save social settings */
export function useSaveWorkspaceSocial() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (settings: WorkspaceSocialPayload) =>
      WorkspaceService.updateSocial(settings),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workspaceKeys.all });
      toast.success(getSuccessMessage({ slug: 'WORKSPACE_UPDATED' }, t as any, 'workspace'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'workspace'));
    },
  });
}

/** Save locations settings */
export function useSaveWorkspaceLocations() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (settings: WorkspaceLocationsPayload) =>
      WorkspaceService.updateLocations(settings),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workspaceKeys.all });
      toast.success(getSuccessMessage({ slug: 'WORKSPACE_UPDATED' }, t as any, 'workspace'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'workspace'));
    },
  });
}

/** Save working hours settings */
export function useSaveWorkspaceWorkingHours() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (settings: WorkspaceWorkingHoursPayload) =>
      WorkspaceService.updateWorkingHours(settings),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workspaceKeys.all });
      toast.success(getSuccessMessage({ slug: 'WORKSPACE_UPDATED' }, t as any, 'workspace'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'workspace'));
    },
  });
}

/** Upload logo */
export function useUploadLogo() {
  return useMutation({
    mutationFn: (file: File) => WorkspaceService.uploadLogo(file),
  });
}

// ─── PAGE HOOK ─────────────────────────────────────────────────────────────

export interface LocationEntry {
  id: string;
  label: string;
  address: string;
  city: string;
  country: string;
  mapUrl: string;
}

export interface DaySchedule {
  open: string;
  close: string;
  closed: boolean;
}

export type WeekSchedule = Record<string, DaySchedule>;

export const DEFAULT_SCHEDULE: WeekSchedule = {
  saturday:  { open: "09:00", close: "17:00", closed: false },
  sunday:    { open: "09:00", close: "17:00", closed: false },
  monday:    { open: "09:00", close: "17:00", closed: false },
  tuesday:   { open: "09:00", close: "17:00", closed: false },
  wednesday: { open: "09:00", close: "17:00", closed: false },
  thursday:  { open: "09:00", close: "17:00", closed: false },
  friday:    { open: "09:00", close: "17:00", closed: true },
};



export function useWorkspacePageState() {
  const { t } = useTranslation();

  // ── State ──────────────────────────────────────────────────
  const [siteName, setSiteName] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [social, setSocial] = useState({
    facebook: "", instagram: "", twitter: "", linkedin: "", tiktok: "", youtube: "", snapchat: "", telegram: "", pinterest: "", threads: "",
  });

  const [locations, setLocations] = useState<LocationEntry[]>([]);
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE);

  // ─── Validation Error State ───────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Individual Loading States ────────────────────────────────────────────────
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);
  const [savingLocations, setSavingLocations] = useState(false);
  const [savingWorkingHours, setSavingWorkingHours] = useState(false);

  // ── React Query Mutations ────────────────────────────────────
  const { data: settingsData, isLoading: isSettingsLoading, error: settingsError } = useWorkspaceSettings();
  const saveIdentityMutation = useSaveWorkspaceIdentity();
  const saveContactMutation = useSaveWorkspaceContact();
  const saveSocialMutation = useSaveWorkspaceSocial();
  const saveLocationsMutation = useSaveWorkspaceLocations();
  const saveWorkingHoursMutation = useSaveWorkspaceWorkingHours();
  const uploadMutation = useUploadLogo();

  const isForbidden = (settingsError as { slug?: string; code?: number })?.slug === 'FORBIDDEN'
    || (settingsError as { code?: number })?.code === 403;

  // ── Handlers ───────────────────────────────────────────────
  const handleLogoUpload = useCallback(async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error((t as any).common.upload.file_too_large);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploadingLogo(true);
    try {
      const url = await uploadMutation.mutateAsync(file);
      setLogoPreview(url);
      toast.success((t as any).common.upload.logo_uploaded);
    } catch {
      setLogoPreview(settingsData?.logoUrl || null);
      toast.error((t as any).common.upload.upload_failed);
    } finally {
      setUploadingLogo(false);
    }
  }, [t, uploadMutation, settingsData]);

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoUpload(file);
  }, [handleLogoUpload]);

  const handleSocialChange = useCallback((key: string, value: string) => {
    setSocial((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleLocationChange = useCallback((id: string, field: keyof LocationEntry, value: string) => {
    setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }, []);

  const makeId = () => `loc-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`;

  const addLocation = useCallback(() => {
    setLocations((prev) => [...prev, { id: makeId(), label: "", address: "", city: "", country: "", mapUrl: "" }]);
  }, []);

  const removeLocation = useCallback((id: string) => {
    setLocations((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }, []);

  const handleScheduleChange = useCallback((day: string, field: keyof DaySchedule, value: string | boolean) => {
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  }, []);

  // ─── Initial Snapshot for Change Detection ──────────────────────────────────
  const [initialSnapshot, setInitialSnapshot] = useState<{
    siteName: string;
    logoUrl: string | null;
    whatsapp: string;
    phone: string;
    email: string;
    social: Record<string, string>;
    locations: LocationEntry[];
    schedule: WeekSchedule;
  } | null>(null);

  // ── Sync Initial Data ──────────────────────────────────────
  useEffect(() => {
    if (settingsData) {
      requestAnimationFrame(() => {
        const sName = settingsData.siteName || "";
        const lUrl = settingsData.logoUrl || null;
        const wApp = settingsData.contactInfo?.whatsapp || "";
        const ph = settingsData.contactInfo?.phone || "";
        const em = settingsData.contactInfo?.email || "";
        const soc = {
          facebook: "", instagram: "", twitter: "", linkedin: "", tiktok: "", youtube: "", snapchat: "", telegram: "", pinterest: "", threads: "",
          ...(settingsData.socialMedia || {})
        };
        const locs = settingsData.locations && settingsData.locations.length > 0
          ? settingsData.locations.map(loc => ({
              id: loc.id, label: loc.label || "", address: loc.address || "", city: loc.city || "", country: loc.country || "", mapUrl: loc.mapUrl || ""
            }))
          : [{ id: "loc-initial", label: "", address: "", city: "", country: "", mapUrl: "" }];
        const sched = settingsData.workingHours && Object.keys(settingsData.workingHours).length > 0
          ? (settingsData.workingHours as WeekSchedule)
          : DEFAULT_SCHEDULE;

        setSiteName(sName);
        setLogoPreview(lUrl);
        setWhatsapp(wApp);
        setPhone(ph);
        setEmail(em);
        setSocial(soc);
        setLocations(locs);
        setSchedule(sched);

        setInitialSnapshot({
          siteName: sName,
          logoUrl: lUrl,
          whatsapp: wApp,
          phone: ph,
          email: em,
          social: soc,
          locations: locs,
          schedule: sched,
        });
      });
    }
  }, [settingsData]);

  // ─── Change Detection Flags ─────────────────────────────────
  const isIdentityChanged = useMemo(() => {
    if (!initialSnapshot) return false;
    return siteName !== initialSnapshot.siteName || (logoPreview || null) !== (initialSnapshot.logoUrl || null);
  }, [siteName, logoPreview, initialSnapshot]);

  const isContactChanged = useMemo(() => {
    if (!initialSnapshot) return false;
    return (
      whatsapp !== initialSnapshot.whatsapp ||
      phone !== initialSnapshot.phone ||
      email !== initialSnapshot.email
    );
  }, [whatsapp, phone, email, initialSnapshot]);

  const isSocialChanged = useMemo(() => {
    if (!initialSnapshot) return false;
    return JSON.stringify(social) !== JSON.stringify(initialSnapshot.social);
  }, [social, initialSnapshot]);

  const isLocationsChanged = useMemo(() => {
    if (!initialSnapshot) return false;
    const currentLocs = locations.map(l => ({
      id: l.id, label: l.label || "", address: l.address || "", city: l.city || "", country: l.country || "", mapUrl: l.mapUrl || ""
    }));
    return JSON.stringify(currentLocs) !== JSON.stringify(initialSnapshot.locations);
  }, [locations, initialSnapshot]);

  const isWorkingHoursChanged = useMemo(() => {
    if (!initialSnapshot) return false;
    return JSON.stringify(schedule) !== JSON.stringify(initialSnapshot.schedule);
  }, [schedule, initialSnapshot]);

  const hasUnsavedChanges = isIdentityChanged || isContactChanged || isSocialChanged || isLocationsChanged || isWorkingHoursChanged;

  // ─── Unsaved Changes Reload Warning (beforeunload) ──────────────────────────
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // ─── Individual Save Triggers ──────────────────────────────
  const handleSaveIdentity = useCallback(async () => {
    setSavingIdentity(true);
    setErrors({});
    const payload = { siteName, logoUrl: logoPreview };
    const result = identitySchema.safeParse(payload);
    if (!result.success) {
      setErrors(extractZodErrors(result.error, t as any, 'workspace'));
      toast.error((t as any).common.zod.fix_errors);
      setSavingIdentity(false);
      return;
    }
    try {
      await saveIdentityMutation.mutateAsync(payload);
      setInitialSnapshot(prev => prev ? { ...prev, siteName, logoUrl: logoPreview } : null);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.slug === 'VALIDATION_ERROR' && e.details && e.details.length > 0) {
        const apiErrors = extractApiErrors(e, t as any, 'workspace.errors');
        if (Object.keys(apiErrors).length > 0) {
          setErrors(apiErrors);
          return;
        }
      }
      console.error("Failed to save Identity:", e);
    } finally {
      setSavingIdentity(false);
    }
  }, [saveIdentityMutation, siteName, logoPreview, t]);

  const handleSaveContact = useCallback(async () => {
    setSavingContact(true);
    setErrors({});
    const payload = { contactInfo: { whatsapp, phone, email } };
    const result = contactSchema.safeParse(payload);
    if (!result.success) {
      setErrors(extractZodErrors(result.error, t as any, 'workspace'));
      toast.error((t as any).common.zod.fix_errors);
      setSavingContact(false);
      return;
    }
    try {
      await saveContactMutation.mutateAsync(payload);
      setInitialSnapshot(prev => prev ? { ...prev, whatsapp, phone, email } : null);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.slug === 'VALIDATION_ERROR' && e.details && e.details.length > 0) {
        const apiErrors = extractApiErrors(e, t as any, 'workspace.errors');
        if (Object.keys(apiErrors).length > 0) {
          setErrors(apiErrors);
          return;
        }
      }
      console.error("Failed to save Contact Info:", e);
    } finally {
      setSavingContact(false);
    }
  }, [saveContactMutation, whatsapp, phone, email, t]);

  const handleSaveSocial = useCallback(async () => {
    setSavingSocial(true);
    setErrors({});
    const payload = { socialMedia: social };
    const result = socialSchema.safeParse(payload);
    if (!result.success) {
      setErrors(extractZodErrors(result.error, t as any, 'workspace'));
      toast.error((t as any).common.zod.fix_errors);
      setSavingSocial(false);
      return;
    }
    try {
      await saveSocialMutation.mutateAsync(payload);
      setInitialSnapshot(prev => prev ? { ...prev, social: { ...social } } : null);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.slug === 'VALIDATION_ERROR' && e.details && e.details.length > 0) {
        const apiErrors = extractApiErrors(e, t as any, 'workspace.errors');
        if (Object.keys(apiErrors).length > 0) {
          setErrors(apiErrors);
          return;
        }
      }
      console.error("Failed to save Social Links:", e);
    } finally {
      setSavingSocial(false);
    }
  }, [saveSocialMutation, social, t]);

  const handleSaveLocations = useCallback(async () => {
    setSavingLocations(true);
    setErrors({});
    const validLocations = locations.filter(l => 
      l.label.trim() || l.address.trim() || l.city.trim() || l.country.trim() || l.mapUrl.trim()
    );
    const payload = { locations: validLocations };
    const result = locationsSchema.safeParse(payload);
    if (!result.success) {
      setErrors(extractZodErrors(result.error, t as any, 'workspace'));
      toast.error((t as any).common.zod.fix_errors);
      setSavingLocations(false);
      return;
    }
    try {
      await saveLocationsMutation.mutateAsync(payload);
      const cleanLocs = validLocations.map(l => ({
        id: l.id, label: l.label || "", address: l.address || "", city: l.city || "", country: l.country || "", mapUrl: l.mapUrl || ""
      }));
      setInitialSnapshot(prev => prev ? { ...prev, locations: cleanLocs } : null);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.slug === 'VALIDATION_ERROR' && e.details && e.details.length > 0) {
        const apiErrors = extractApiErrors(e, t as any, 'workspace.errors');
        if (Object.keys(apiErrors).length > 0) {
          setErrors(apiErrors);
          return;
        }
      }
      console.error("Failed to save Locations:", e);
    } finally {
      setSavingLocations(false);
    }
  }, [saveLocationsMutation, locations, t]);

  const handleSaveWorkingHours = useCallback(async () => {
    setSavingWorkingHours(true);
    setErrors({});
    const payload = { workingHours: schedule };
    const result = workingHoursSchema.safeParse(payload);
    if (!result.success) {
      setErrors(extractZodErrors(result.error, t as any, 'workspace'));
      toast.error((t as any).common.zod.fix_errors);
      setSavingWorkingHours(false);
      return;
    }
    try {
      await saveWorkingHoursMutation.mutateAsync(payload);
      setInitialSnapshot(prev => prev ? { ...prev, schedule: { ...schedule } } : null);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.slug === 'VALIDATION_ERROR' && e.details && e.details.length > 0) {
        const apiErrors = extractApiErrors(e, t as any, 'workspace.errors');
        if (Object.keys(apiErrors).length > 0) {
          setErrors(apiErrors);
          return;
        }
      }
      console.error("Failed to save Working Hours:", e);
    } finally {
      setSavingWorkingHours(false);
    }
  }, [saveWorkingHoursMutation, schedule, t]);

  return {
    siteName, setSiteName,
    logoPreview, setLogoPreview,
    whatsapp, setWhatsapp,
    phone, setPhone,
    email, setEmail,
    uploadingLogo, setUploadingLogo,
    fileRef,
    social, setSocial,
    locations, setLocations,
    schedule, setSchedule,
    errors, setErrors,
    savingIdentity, savingContact, savingSocial, savingLocations, savingWorkingHours,
    isIdentityChanged, isContactChanged, isSocialChanged, isLocationsChanged, isWorkingHoursChanged, hasUnsavedChanges,
    isSettingsLoading, settingsData,
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
  };
}
