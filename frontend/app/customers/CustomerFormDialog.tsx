"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Customer } from "@/lib/services/customer.service";
import { useCustomerForm } from "@/lib/hooks/useCustomers";
import { toast } from "sonner";
import { getErrorMessage, extractApiErrors } from "@/lib/utils/error";
import { ApiError } from "@/lib/api/client";
import { type Dictionary } from "@/lib/i18n/dictionaries";
import { Loader2, Check } from "lucide-react";
import { CreateCustomerSchema, UpdateCustomerSchema } from "@/lib/validations/customer.schema";
import { extractZodErrors } from "@/lib/validations/common.schema";

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
}

export function CustomerFormDialog({ open, onOpenChange, customer }: CustomerFormDialogProps) {
  const {
    dict, isEditing, saving, errors, handleSubmit,
    fullName, setFullName, phone, setPhone, email, setEmail,
    gender, setGender, dateOfBirth, setDateOfBirth, city, setCity,
    acquisitionSource, setAcquisitionSource, tags, setTags, notes, setNotes
  } = useCustomerForm({ open, onOpenChange, customer });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[calc(100vw-2rem)] sm:w-full !max-w-[540px] p-0 overflow-hidden !rounded-2xl bg-surface-card"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
          <DialogClose render={
            <button className="dialog-close-btn">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          } />
          <DialogHeader className="gap-1.5 pe-8">
            <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
              {isEditing ? dict.form?.editTitle : dict.form?.addTitle}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-text-muted leading-relaxed m-0">
              {isEditing ? dict.form?.editDescription : dict.form?.addDescription}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="h-px bg-border-default" />

        {/* Content */}
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="px-6 py-5 max-h-[60vh] overflow-y-auto flex flex-col gap-4">
          
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name" className="text-xs font-medium text-text-subtle">
              {dict.form?.fields?.fullName} <span className="text-destructive">*</span>
            </Label>
            <Input 
              id="full_name" 
              name="full_name"
              autoComplete="new-password"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={dict.form?.placeholders?.fullName}
              className="h-10 !rounded-lg text-sm"
              error={errors.full_name}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone" className="text-xs font-medium text-text-subtle">
              {dict.form?.fields?.phone} <span className="text-destructive">*</span>
            </Label>
            <Input 
              id="phone" 
              name="phone"
              autoComplete="new-password"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={dict.form?.placeholders?.phone}
              dir="ltr" 
              className="h-10 !rounded-lg text-sm text-start"
              error={errors.phone}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-text-subtle">
              {dict.form?.fields?.email} <span className="text-destructive">*</span>
            </Label>
            <Input 
              id="email" 
              name="email"
              type="email" 
              autoComplete="new-password"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={dict.form?.placeholders?.email}
              dir="ltr" 
              className="h-10 !rounded-lg text-sm text-start"
              error={errors.email}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gender" className="text-xs font-medium text-text-subtle">
                {dict.form?.fields?.gender}
              </Label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as "male" | "female" | "")}
                className="flex h-10 w-full items-center justify-between !rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-all duration-300 outline-none placeholder:text-muted-foreground focus:border-primary focus:shadow-[0_0_15px_rgba(79,70,229,0.25)] focus-visible:border-primary focus-visible:shadow-[0_0_15px_rgba(79,70,229,0.25)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">--</option>
                <option value="male">{dict.form?.fields?.genderMale || "Male"}</option>
                <option value="female">{dict.form?.fields?.genderFemale || "Female"}</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date_of_birth" className="text-xs font-medium text-text-subtle">
                {dict.form?.fields?.dateOfBirth}
              </Label>
              <Input 
                id="date_of_birth" 
                type="date" 
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="h-10 !rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city" className="text-xs font-medium text-text-subtle">
              {dict.form?.fields?.city}
            </Label>
            <Input 
              id="city" 
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={dict.form?.placeholders?.city}
              className="h-10 !rounded-lg text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acquisition_source" className="text-xs font-medium text-text-subtle">
              {dict.form?.fields?.acquisitionSource}
            </Label>
            <Input 
              id="acquisition_source" 
              value={acquisitionSource}
              onChange={(e) => setAcquisitionSource(e.target.value)}
              placeholder={dict.form?.placeholders?.acquisitionSource}
              className="h-10 !rounded-lg text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tags" className="text-xs font-medium text-text-subtle">
              {dict.form?.fields?.tags}
            </Label>
            <Input 
              id="tags" 
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={dict.form?.placeholders?.tags} 
              className="h-10 !rounded-lg text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes" className="text-xs font-medium text-text-subtle">
              {dict.form?.fields?.notes}
            </Label>
            <Textarea 
              id="notes" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={dict.form?.placeholders?.notes}
              className="min-h-[100px] w-full !bg-background border border-input !rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:border-primary focus-visible:ring-0 focus-visible:shadow-[0_0_15px_rgba(79,70,229,0.25)] transition-all resize-y"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-default flex items-center justify-end gap-3">
          <DialogClose render={<Button variant="outline" type="button" className="h-10 px-5" />}>
            {dict.form?.cancel || "Cancel"}
          </DialogClose>

          <Button type="button" onClick={handleSubmit} disabled={saving || !fullName.trim() || !phone.trim() || !email.trim()} className="h-10 px-5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground border-none gap-1.5">
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
            {saving ? (dict.form?.saving || "Saving...") : (dict.form?.save || "Save")}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
