import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Loader2, ChevronDown, Check, LayoutDashboard, CalendarDays,
  Users, FileText, MessageSquare, Settings, ShieldCheck, ChevronRight, ChevronLeft, Eye, EyeOff
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { type TeamMember } from "@/lib/services/team.service";

export const ALL_ROLES: TeamMember['role'][] = ["Admin", "User"];
import { useCreateMember, useUpdateMember } from "@/lib/hooks/useTeam";
import { toast } from "sonner";
import { createTeamMemberSchema, updateTeamMemberSchema } from "@/lib/validations/team.schema";
import { extractZodErrors, extractApiErrors } from "@/lib/validations/common.schema";
import { ApiError } from "@/lib/api/client";

/* ─── Types & Constants ─────────────────────────────────────────── */
type ModuleId = "dashboard" | "inbox" | "bookings" | "customers" | "cms" | "settings";

export type NestedPermissions = {
  dashboard: boolean;
  inbox: boolean;
  bookings: boolean;
  customers: { clients_directory: boolean };
  cms: { services: boolean; articles: boolean; comments: boolean };
  settings: { workspace: boolean; team: boolean; media: boolean; api_key: boolean };
};

function getRoleIndicator(role: TeamMember['role']): string {
  switch (role) {
    case "Admin": return "bg-gradient-to-r from-primary to-accent";
    case "User": return "bg-gradient-to-r from-sky-500 to-cyan-500";
    default: return "bg-gray-500";
  }
}

/* ─── Wizard Step Indicator ─────────────────────────────────────── */
function StepIndicator({
  currentStep,
  dict,
  role
}: {
  currentStep: number;
  dict: Record<string, unknown>;
  role: TeamMember['role'];
}) {
  const steps = role === "Admin" ? [1, 3] : [1, 2, 3];
  return (
    <div className="flex items-center gap-3 mt-5">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0 ${s < currentStep
                ? "bg-primary text-white"
                : s === currentStep
                  ? "bg-primary/15 text-primary border-2 border-primary"
                  : "bg-surface-subtle text-text-muted border border-border-default"
                }`}
            >
              {s < currentStep ? <Check size={12} strokeWidth={3} /> : (role === "Admin" && s === 3 ? 2 : s)}
            </div>
            <span
              className={`text-xs font-medium whitespace-nowrap hidden sm:inline ${s === currentStep ? "text-foreground" : "text-text-muted"
                }`}
            >
              {(dict[`step${s}` as keyof typeof dict] as string) || `Step ${s}`}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px transition-colors duration-300 ${s < currentStep ? "bg-primary/50" : "bg-border-default"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─── Main Dialog Component ─────────────────────────────────────── */
export function UserFormDialog({
  open,
  onOpenChange,
  user,
  dict,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: TeamMember | null;
  dict: ReturnType<typeof useTranslation>["t"]["users"] & { wizard?: Record<string, unknown> };
}) {
  const { t, locale } = useTranslation();
  const createMutation = useCreateMember();
  const updateMutation = useUpdateMember();
  const isEditing = !!user;

  // Wizard State
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<TeamMember['role']>("User");

  // Permissions State
  const [permissions, setPermissions] = useState<NestedPermissions>({
    dashboard: true,
    inbox: false,
    bookings: false,
    customers: { clients_directory: false },
    cms: { services: false, articles: false, comments: false },
    settings: { workspace: false, team: false, media: false, api_key: false },
  });

  // ─── Validation Error State ───────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        setStep(1);
        if (user) {
          setFullName(user.full_name || "");
          setUsername(user.username || "");
          setEmail(user.email || "");
          setJobTitle(user.job_title || "");
          setRole(user.role || "User");

          // Initialize permissions from user object
          if (user.permissions) {
            const p = user.permissions as any;
            setPermissions({
              dashboard: !!p.dashboard,
              inbox: !!p.inbox,
              bookings: !!p.bookings,
              customers: {
                clients_directory: !!p.customers?.clients_directory,
              },
              cms: {
                services: !!p.cms?.services,
                articles: !!p.cms?.articles,
                comments: !!p.cms?.comments,
              },
              settings: {
                workspace: !!p.settings?.workspace,
                team: !!p.settings?.team,
                media: !!p.settings?.media,
                api_key: !!p.settings?.api_key,
              },
            });
          } else {
            setPermissions({
              dashboard: true,
              inbox: false,
              bookings: false,
              customers: { clients_directory: false },
              cms: { services: false, articles: false, comments: false },
              settings: { workspace: false, team: false, media: false, api_key: false },
            });
          }
        } else {
          setFullName("");
          setUsername("");
          setEmail("");
          setJobTitle("");
          setPassword("");
          setRole("User");
          setPermissions({
            dashboard: true,
            inbox: false,
            bookings: false,
            customers: { clients_directory: false },
            cms: { services: false, articles: false, comments: false },
            settings: { workspace: false, team: false, media: false, api_key: false },
          });
        }
      }, 0);
      return () => clearTimeout(t);
    }
  }, [open, user]);

  const togglePermission = (id: ModuleId) => {
    setPermissions(prev => ({ ...prev, [id]: !(prev as any)[id] }));
  };

  const togglePage = (moduleId: ModuleId, pageId: string) => {
    setPermissions(prev => {
      const modulePerms = (prev as any)[moduleId];
      if (typeof modulePerms === 'object') {
        return {
          ...prev,
          [moduleId]: {
            ...modulePerms,
            [pageId]: !modulePerms[pageId]
          }
        };
      }
      return prev;
    });
  };

  const handleNext = () => {
    if (step === 1) {
      const payload = {
        full_name: fullName,
        username,
        email,
        job_title: jobTitle,
        role,
        password: password || undefined
      };
      // @ts-ignore - t is from useTranslation but we just pass locale dicts
      const schema = isEditing ? updateTeamMemberSchema : createTeamMemberSchema;
      const result = schema.safeParse(payload);
      if (!result.success) {
        setErrors(extractZodErrors(result.error, t as any, 'common.zod'));
        toast.error((t as any)?.common?.zod?.fix_errors || "Please fix errors");
        return;
      }
      setErrors({});
    }
    if (role === "Admin") {
      setStep(3);
    } else {
      setStep((s) => Math.min(s + 1, 3) as 1 | 2 | 3);
    }
  };
  const handleBack = () => {
    if (role === "Admin" && step === 3) {
      setStep(1);
    } else {
      setStep((s) => Math.max(s - 1, 1) as 1 | 2 | 3);
    }
  };

  const isFormValid = fullName.trim() !== "" && username.trim() !== "" && email.trim() !== "" && role.trim() !== "" && (isEditing || password.trim() !== "");

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload: Partial<Omit<TeamMember, 'id' | 'created_at'>> & { password?: string } = {
        email,
        full_name: fullName,
        username,
        job_title: jobTitle,
        role,
        permissions
      };

      if (isEditing && user) {
        if (password) payload.password = password;
        await updateMutation.mutateAsync({ id: user.id, data: payload });
      } else {
        payload.password = password;
        await createMutation.mutateAsync(payload);
      }

      onOpenChange(false);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.slug === 'VALIDATION_ERROR' && e.details && e.details.length > 0) {
          const apiErrors = extractApiErrors(e, t as any, 'users.errors');
          if (Object.keys(apiErrors).length > 0) {
            setErrors(apiErrors);
            setStep(1); // Return to first step where most inputs are
            return;
          }
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const isRtl = locale === "ar";
  const ArrowNext = isRtl ? ChevronLeft : ChevronRight;
  const ArrowBack = isRtl ? ChevronRight : ChevronLeft;

  const wizardDict = dict.wizard || {};

  const permissionItems = [
    { id: "dashboard", label: (wizardDict?.modules as any)?.dashboard || "Dashboard", icon: LayoutDashboard, type: "standalone" as const },
    { id: "inbox", label: (wizardDict?.modules as any)?.inbox || "Inbox", icon: MessageSquare, type: "standalone" as const },
    { id: "bookings", label: (wizardDict?.modules as any)?.bookings || "Bookings", icon: CalendarDays, type: "standalone" as const },
    { id: "clients_directory", label: (wizardDict?.pages as any)?.clients_directory || "Clients Directory", icon: Users, type: "nested_page" as const, parentModule: "customers" as const, pageKey: "clients_directory" },
    { id: "services", label: (wizardDict?.pages as any)?.services || "Services", icon: FileText, type: "nested_page" as const, parentModule: "cms" as const, pageKey: "services" },
    { id: "articles", label: (wizardDict?.pages as any)?.articles || "Articles", icon: FileText, type: "nested_page" as const, parentModule: "cms" as const, pageKey: "articles" },
    { id: "comments", label: (wizardDict?.pages as any)?.comments || "Comments", icon: MessageSquare, type: "nested_page" as const, parentModule: "cms" as const, pageKey: "comments" },
    {
      id: "settings",
      label: (wizardDict?.modules as any)?.settings || "Settings",
      icon: Settings,
      type: "settings_group" as const,
      pages: [
        { key: "workspace", label: (wizardDict?.pages as any)?.workspace || "Workspace" },
        { key: "team", label: (wizardDict?.pages as any)?.team || "Team & Roles" },
        { key: "media", label: (wizardDict?.pages as any)?.media || "Media" },
        { key: "api_key", label: (wizardDict?.pages as any)?.api_key || "API Keys" },
      ]
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-2rem)] sm:w-full !max-w-[540px] p-0 overflow-hidden !rounded-2xl bg-surface-card"
        showCloseButton={false}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="relative px-6 pt-6 pb-5">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />

          {/* Close Button — custom positioned */}
          <DialogClose
            render={
              <button className="dialog-close-btn">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            }
          />

          <DialogHeader className="gap-1.5 pe-8">
            <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
              {isEditing ? dict.actions.editUser : dict.actions.addUser}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-text-muted leading-relaxed m-0">
              {(wizardDict[`step${step}Desc`] as string) || dict.actions.addUserDesc}
            </DialogDescription>
          </DialogHeader>

          {/* Stepper */}
          <StepIndicator currentStep={step} dict={wizardDict} role={role} />
        </div>

        {/* ── Divider ─────────────────────────────────────────── */}
        <div className="h-px bg-border-default" />

        {/* ── Form Body ───────────────────────────────────────── */}
        <div className="px-6 py-5 max-h-[55vh] overflow-y-auto">
          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="form-fullname" className="text-xs font-medium text-text-subtle">{dict.form.fullName}</Label>
                  <Input
                    id="form-fullname"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={dict.form.fullNamePlaceholder}
                    className="h-10 !rounded-lg text-sm"
                    error={errors.full_name}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="form-username" className="text-xs font-medium text-text-subtle">{dict.form.username}</Label>
                  <Input
                    id="form-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={dict.form.usernamePlaceholder}
                    dir="ltr"
                    className="h-10 !rounded-lg text-sm text-start"
                    error={errors.username}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="form-email" className="text-xs font-medium text-text-subtle">{dict.form.email}</Label>
                  <Input
                    id="form-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={dict.form.emailPlaceholder}
                    dir="ltr"
                    className="h-10 !rounded-lg text-sm text-start"
                    error={errors.email}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="form-jobtitle" className="text-xs font-medium text-text-subtle">{dict.form.jobTitle}</Label>
                  <Input
                    id="form-jobtitle"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder={dict.form.jobTitlePlaceholder}
                    className="h-10 !rounded-lg text-sm"
                    error={errors.job_title}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="form-password" className="text-xs font-medium text-text-subtle">{dict.form.password}</Label>
                  <Input
                    id="form-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isEditing ? dict.form.passwordEditPlaceholder : dict.form.passwordPlaceholder}
                    dir="ltr"
                    className="h-10 !rounded-lg text-sm text-start"
                    error={errors.password}
                    endAdornment={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-text-muted hover:text-foreground transition-colors outline-none cursor-pointer p-1"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="form-role" className="text-xs font-medium text-text-subtle">{dict.form.role}</Label>
                  <div className="relative">
                    <div className={`absolute start-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${getRoleIndicator(role)} shadow-sm`} />
                    <select
                      id="form-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value as TeamMember['role'])}
                      className="w-full h-10 bg-background border border-input rounded-lg ps-8 pe-9 text-sm text-foreground focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(20,57,226,0.25)] appearance-none transition-all duration-200 cursor-pointer"
                    >
                      {ALL_ROLES.map((r) => (
                        <option key={r} value={r}>{dict.roles[r]}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute end-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Permissions */}
          {step === 2 && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-end-4 duration-300">
              {permissionItems.map((item) => {
                const Icon = item.icon;
                
                if (item.type === "standalone") {
                  const isChecked = !!(permissions as any)[item.id];
                  return (
                    <div
                      key={item.id}
                      onClick={() => togglePermission(item.id as ModuleId)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none
                        ${isChecked
                          ? "bg-primary/5 border-primary/40"
                          : "bg-transparent border-border-default hover:border-border-strong"}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${isChecked ? "bg-primary text-white" : "bg-surface-subtle text-text-muted"}`}>
                          <Icon size={16} />
                        </div>
                        <span className={`text-sm font-medium transition-colors ${isChecked ? "text-foreground" : "text-text-subtle"}`}>
                          {item.label}
                        </span>
                      </div>
                      <div className={`w-10 h-[22px] rounded-full flex items-center px-[3px] transition-colors duration-300 shrink-0 ${isChecked ? "bg-primary" : "bg-surface-subtle border border-border-default"}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${isChecked ? (isRtl ? "-translate-x-[16px]" : "translate-x-[16px]") : "translate-x-0"}`} />
                      </div>
                    </div>
                  );
                }

                if (item.type === "nested_page") {
                  const parentModule = item.parentModule!;
                  const pageKey = item.pageKey!;
                  const isChecked = !!(permissions as any)[parentModule]?.[pageKey];
                  return (
                    <div
                      key={item.id}
                      onClick={() => togglePage(parentModule, pageKey)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none
                        ${isChecked
                          ? "bg-primary/5 border-primary/40"
                          : "bg-transparent border-border-default hover:border-border-strong"}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${isChecked ? "bg-primary text-white" : "bg-surface-subtle text-text-muted"}`}>
                          <Icon size={16} />
                        </div>
                        <span className={`text-sm font-medium transition-colors ${isChecked ? "text-foreground" : "text-text-subtle"}`}>
                          {item.label}
                        </span>
                      </div>
                      <div className={`w-10 h-[22px] rounded-full flex items-center px-[3px] transition-colors duration-300 shrink-0 ${isChecked ? "bg-primary" : "bg-surface-subtle border border-border-default"}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${isChecked ? (isRtl ? "-translate-x-[16px]" : "translate-x-[16px]") : "translate-x-0"}`} />
                      </div>
                    </div>
                  );
                }

                // settings_group
                const modulePerms = (permissions as any)[item.id] || {};
                const isSectionActive = Object.values(modulePerms).some(Boolean);

                return (
                  <div key={item.id} className="flex flex-col rounded-xl border border-border-default overflow-hidden">
                    <div className={`flex items-center gap-3 p-3.5 border-b border-border-default transition-colors ${isSectionActive ? "bg-primary/5" : "bg-surface-subtle/30"}`}>
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${isSectionActive ? "bg-primary/10 text-primary" : "bg-surface-subtle text-text-muted"}`}>
                        <Icon size={15} />
                      </div>
                      <span className={`text-sm font-semibold ${isSectionActive ? "text-primary" : "text-text-subtle"}`}>
                        {item.label}
                      </span>
                    </div>
                    <div className="flex flex-col bg-surface-card divide-y divide-border-default/50">
                      {item.pages?.map((page) => {
                        const isChecked = !!modulePerms[page.key];
                        return (
                          <div
                            key={page.key}
                            onClick={() => togglePage(item.id as ModuleId, page.key)}
                            className="flex items-center justify-between p-3 ps-12 hover:bg-surface-subtle/50 transition-colors cursor-pointer select-none"
                          >
                            <span className={`text-[13px] font-medium ${isChecked ? "text-foreground" : "text-text-muted"}`}>
                              {page.label}
                            </span>
                            <div className={`w-9 h-5 rounded-full flex items-center px-[2px] transition-colors duration-300 shrink-0 ${isChecked ? "bg-primary" : "bg-surface-subtle border border-border-default"}`}>
                              <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-300 ${isChecked ? (isRtl ? "-translate-x-[14px]" : "translate-x-[14px]") : "translate-x-0"}`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 3: Review */}
          {step === 3 && (
            <div className="flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-300">

              {/* Identity Review */}
              <div className="border border-border-default rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-surface-subtle/50 border-b border-border-default">
                  <ShieldCheck size={14} className="text-primary" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">{(wizardDict?.review as Record<string, string> | undefined)?.identity}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">{dict.form.fullName}</span>
                    <span className="text-sm font-semibold text-foreground">{fullName || "—"}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">{dict.form.username}</span>
                    <span className="text-sm font-mono text-text-subtle" dir="ltr">@{username || "—"}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">{dict.form.email}</span>
                    <span className="text-sm text-text-subtle truncate">{email || "—"}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">{dict.form.role}</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${getRoleIndicator(role)}`} />
                      <span className="text-sm font-medium text-foreground">{dict.roles[role]}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Permissions Review */}
              <div className="border border-border-default rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-surface-subtle/50 border-b border-border-default">
                  <Check size={14} className="text-emerald-500" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    {role === "Admin"
                      ? (dict.details?.accessiblePages || "Accessible Pages")
                      : ((wizardDict?.review as Record<string, string> | undefined)?.selectedModules)}
                  </span>
                </div>
                {role === "Admin" ? (
                  <div className="p-4 bg-surface-card text-sm font-semibold text-primary">
                    {dict.details?.allPagesAccess || "Full access to all pages (Admin permissions)"}
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-border-default/50">
                    {permissionItems.map(item => {
                      if (item.type === "standalone") {
                        if (!(permissions as any)[item.id]) return null;
                        return (
                          <div key={item.id} className="flex items-center gap-2 px-4 py-2.5">
                            <item.icon size={14} className="text-primary" />
                            <span className="text-sm font-medium text-foreground">
                              {item.label}
                            </span>
                          </div>
                        );
                      } else if (item.type === "nested_page") {
                        const parentModule = item.parentModule!;
                        const pageKey = item.pageKey!;
                        if (!(permissions as any)[parentModule]?.[pageKey]) return null;
                        return (
                          <div key={item.id} className="flex items-center gap-2 px-4 py-2.5">
                            <item.icon size={14} className="text-primary" />
                            <span className="text-sm font-medium text-foreground">
                              {item.label}
                            </span>
                          </div>
                        );
                      } else {
                        // settings_group
                        const modulePerms = (permissions as any)[item.id] || {};
                        const activePages = item.pages?.filter(p => modulePerms[p.key]) || [];
                        if (activePages.length === 0) return null;
                        return (
                          <div key={item.id} className="flex flex-col gap-2 px-4 py-3">
                            <div className="flex items-center gap-2 text-primary">
                              <item.icon size={14} />
                              <span className="text-sm font-semibold">
                                {item.label}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 ps-6">
                              {activePages.map(page => (
                                <span key={page.key} className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-subtle border border-border-default text-xs font-medium text-foreground">
                                  {page.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    })}
                    
                    {/* Empty State */}
                    {(() => {
                      const hasStandalone = permissionItems.some(item => item.type === "standalone" && (permissions as any)[item.id]);
                      const hasNestedPages = permissionItems.some(item => item.type === "nested_page" && (permissions as any)[item.parentModule!]?.[item.pageKey!]);
                      const hasSettings = permissionItems.some(item => item.type === "settings_group" && Object.values((permissions as any)[item.id] || {}).some(Boolean));
                      if (!hasStandalone && !hasNestedPages && !hasSettings) {
                        return (
                          <div className="p-4">
                            <span className="text-xs text-text-muted italic">{(wizardDict?.review as Record<string, string> | undefined)?.noModules}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-border-default flex items-center justify-between">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={handleBack} className="h-10 px-4 gap-1.5">
              <ArrowBack size={14} />
              {wizardDict?.back as string}
            </Button>
          ) : (
            <DialogClose render={<Button variant="outline" type="button" className="h-10 px-5" />}>
              {dict.actions.cancel}
            </DialogClose>
          )}

          {step < 3 ? (
            <Button type="button" onClick={handleNext} disabled={step === 1 && !isFormValid} className="h-10 px-5 font-semibold gap-1.5">
              {wizardDict?.next as string}
              <ArrowNext size={14} />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={saving} className="px-5 font-semibold gap-1.5">
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
              {saving ? dict.actions.saving : (wizardDict?.confirm as string)}
            </Button>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}
