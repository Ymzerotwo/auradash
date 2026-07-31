"use client";

import React from "react";
import { User, Camera, Eye, EyeOff, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfileFormDialog } from "@/lib/hooks/useProfile";
import Image from "next/image";

interface ProfileFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileFormDialog({ open, onOpenChange }: ProfileFormDialogProps) {
  const {
    t, p, user, isAdmin,
    fullName, setFullName, username, setUsername, email, setEmail,
    jobTitle, setJobTitle, photoUrl, setPhotoUrl, 
    oldPassword, setOldPassword, newPassword, setNewPassword,
    showOldPass, setShowOldPass, showNewPass, setShowNewPass,
    isAvatarUploading, updateProfile, uploadPhoto,
    fileInputRef, handleFileChange, handleSubmit
  } = useProfileFormDialog({ open, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[calc(100%-2rem)] sm:w-full sm:!max-w-[540px] p-0 overflow-hidden !rounded-2xl bg-surface-card"
        showCloseButton={false}
      >
        <div className="relative px-4 sm:px-6 pt-5 sm:pt-6 pb-4 sm:pb-5">
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

          <DialogHeader className="gap-1.5 pe-8">
            <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
              {p.title}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-text-muted leading-relaxed m-0">
              {isAdmin ? p.descAdmin : p.descWorker}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="h-px bg-border-default" />

        <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-4 sm:py-5 max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col gap-6">
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-4 bg-primary rounded-full" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">{p.sections.identity}</span>
            </div>

            <div className="flex justify-center w-full mb-3 mt-1">
              <div 
                className="relative group shrink-0 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center border-2 border-border-default overflow-hidden">
                  {uploadPhoto.isPending ? (
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  ) : photoUrl ? (
                    <Image 
                      src={photoUrl} 
                      alt="Profile" 
                      width={96} 
                      height={96} 
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <User className="w-10 h-10 text-text-subtle" />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-7 h-7 text-white" />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="form-fullname" className="text-xs font-medium text-text-subtle">{p.fields.fullName}</Label>
                <div className="relative">
                  <Input
                    id="form-fullname"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={p.fields.fullNamePlaceholder}
                    className="h-10 !rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="form-jobtitle" className="text-xs font-medium text-text-subtle">{p.fields.jobTitle}</Label>
                <div className="relative">
                  <Input
                    id="form-jobtitle"
                    value={jobTitle}
                    disabled={!isAdmin}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder={p.fields.jobTitlePlaceholder}
                    className="h-10 !rounded-lg text-sm disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="form-username" className="text-xs font-medium text-text-subtle">{p.fields.username}</Label>
                <div className="relative">
                  <Input
                    id="form-username"
                    value={username}
                    disabled={!isAdmin}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={p.fields.usernamePlaceholder}
                    dir="ltr"
                    className="h-10 !rounded-lg text-sm text-start disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="form-email" className="text-xs font-medium text-text-subtle">{p.fields.email}</Label>
                <div className="relative">
                  <Input
                    id="form-email"
                    type="email"
                    value={email}
                    disabled={!isAdmin}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={p.fields.emailPlaceholder}
                    dir="ltr"
                    className="h-10 !rounded-lg text-sm text-start disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-2 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-4 bg-accent rounded-full" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">{p.sections.security}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="form-old-password" className="text-xs font-medium text-text-subtle">{p.password.current}</Label>
                <div className="relative">
                  <Input
                    id="form-old-password"
                    type={showOldPass ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder={p.password.currentPlaceholder}
                    dir="ltr"
                    className="h-10 !rounded-lg text-sm pe-10 text-start"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground outline-none border-none bg-transparent cursor-pointer"
                  >
                    {showOldPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="form-new-password" className="text-xs font-medium text-text-subtle">{p.password.new}</Label>
                <div className="relative">
                  <Input
                    id="form-new-password"
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={p.password.newPlaceholder}
                    dir="ltr"
                    className="h-10 !rounded-lg text-sm pe-10 text-start"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground outline-none border-none bg-transparent cursor-pointer"
                  >
                    {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-border-default flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 bg-surface-subtle/20">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 w-full sm:w-auto px-5 text-sm font-medium border-border-default hover:bg-surface-subtle transition-all"
          >
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateProfile.isPending || isAvatarUploading}
            className="h-10 w-full sm:w-auto px-6 text-sm font-semibold bg-primary hover:bg-primary-600 shadow-lg shadow-primary/20 gap-2 min-w-[120px] justify-center"
          >
            {updateProfile.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {p.actions.updating}
              </>
            ) : (
              p.actions.save
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
