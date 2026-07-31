import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Loader2, Check, ChevronRight, ChevronLeft, Search, 
  Trash2, Plus
} from "lucide-react";
import { useBookingForm } from "@/lib/hooks/useBookings";

/* ─── Wizard Step Indicator ─────────────────────────────────────── */
function StepIndicator({
  currentStep,
  dict
}: {
  currentStep: number;
  dict: Record<string, any>
}) {
  const steps = [1, 2, 3];
  return (
    <div className="flex items-center justify-between gap-2 sm:gap-4 mt-4 w-full">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0 ${s < currentStep
                ? "bg-primary text-white"
                : s === currentStep
                  ? "bg-primary/15 text-primary border-2 border-primary"
                  : "bg-surface-subtle text-text-muted border border-border-default"
                }`}
            >
              {s < currentStep ? <Check size={12} strokeWidth={3} /> : s}
            </div>
            <span
              className={`text-[10px] sm:text-xs whitespace-nowrap ${
                s === currentStep 
                  ? "text-foreground font-bold inline-block" 
                  : "text-text-muted font-medium hidden sm:inline-block"
                }`}
            >
              {dict[`step${s}`] || `Step ${s}`}
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
export function BookingFormDialog({
  open,
  onOpenChange,
  bookingId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId?: string;
}) {
  const {
    dict, wizardDict, isRtl,
    step, handleNext, handleBack, handleSubmit, saving,
    errors, setErrors,
    customerSearch, setCustomerSearch, isCustomerDropdownOpen, setIsCustomerDropdownOpen, selectedCustomer, setSelectedCustomer,
    categorySearch, setServiceCategorySearch, isServiceCategoryDropdownOpen, setIsServiceCategoryDropdownOpen, selectedServiceCategory, setSelectedServiceCategory,
    serviceType, setServiceType, serviceSearch, setServiceSearch, isServiceDropdownOpen, setIsServiceDropdownOpen, selectedService, setSelectedService,
    customServiceName, setCustomServiceName, customPrice, setCustomPrice, existingPrice, setExistingPrice,
    scheduledFrom, setScheduledFrom, scheduledTo, setScheduledTo, notes, setNotes,
    selectedServicesList, handleAddService, handleRemoveService,
    customerRef, categoryRef, serviceRef,
    filteredCustomers, fetchNextCustomer, hasNextCustomer, isFetchingCustomer, isCustomerSearching,
    filteredCategories, fetchNextServiceCategory, hasNextServiceCategory, isFetchingServiceCategory, isCategorySearching,
    filteredServices, fetchNextService, hasNextService, isFetchingService, isServiceSearching,
    handleScroll, isDetailLoading, isStep1Valid, isAddServiceDisabled
  } = useBookingForm({ open, onOpenChange, bookingId });

  const ArrowNext = isRtl ? ChevronLeft : ChevronRight;
  const ArrowBack = isRtl ? ChevronRight : ChevronLeft;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] sm:w-[calc(100vw-2rem)] sm:max-w-[620px] p-0 overflow-hidden rounded-2xl bg-surface-card border border-border-default shadow-2xl"
        showCloseButton={false}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="relative px-4 sm:px-6 pt-5 sm:pt-6 pb-4 sm:pb-5">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />

          {/* Close Button */}
          <DialogClose
            render={
              <button className="absolute top-5 end-5 w-8 h-8 rounded-full flex items-center justify-center text-text-subtle hover:text-foreground hover:bg-surface-subtle transition-colors cursor-pointer border-none outline-none bg-transparent">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            }
          />

          <DialogHeader className="gap-1.5 pe-10">
            <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
              {bookingId ? (dict.editBooking || "Edit Booking") : (dict.createBooking || "Create Booking")}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-text-muted leading-relaxed m-0">
              {wizardDict[`step${step}Desc`] || "Provide the required booking details."}
            </DialogDescription>
          </DialogHeader>

          {/* Stepper */}
          <StepIndicator currentStep={step} dict={wizardDict} />
        </div>

        {/* ── Divider ─────────────────────────────────────────── */}
        <div className="h-px bg-border-default" />

        {/* ── Form Body ───────────────────────────────────────── */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 max-h-[75vh] sm:max-h-[60vh] overflow-y-auto">
          {bookingId && isDetailLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 animate-in fade-in duration-200">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs font-semibold text-text-muted">
                {wizardDict.loadingDetails || "Loading booking details..."}
              </span>
            </div>
          ) : (
            <>
              {/* STEP 1: Customer & Service Selection */}
              {step === 1 && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Customer Selection */}
              <div className="flex flex-col gap-1.5 relative">
                <Label className="text-xs font-medium text-text-subtle">{wizardDict.customer} <span className="text-destructive">*</span></Label>
                
                {!selectedCustomer ? (
                  <div className="relative" ref={customerRef}>
                    <div className="absolute top-0 bottom-0 start-3 flex items-center pointer-events-none text-text-muted z-10">
                      <Search className="w-4 h-4" />
                    </div>
                    <Input
                      placeholder={wizardDict.customerPlaceholder || "Search by name or phone..."}
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setIsCustomerDropdownOpen(true);
                      }}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      className="h-10 !rounded-lg text-sm w-full ps-9"
                      error={errors.customer_id}
                    />
                    {isCustomerDropdownOpen && (
                      <div 
                        className="absolute z-[60] w-full mt-2 max-h-48 overflow-y-auto bg-surface-overlay backdrop-blur-md border border-border-default rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] p-1 flex flex-col gap-0.5"
                        onScroll={(e) => handleScroll(e, fetchNextCustomer, !!hasNextCustomer, isFetchingCustomer)}
                      >
                        {filteredCustomers.length > 0 ? (
                          <>
                            {filteredCustomers.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCustomer(c);
                                  setCustomerSearch("");
                                  setIsCustomerDropdownOpen(false);
                                  setErrors(prev => ({ ...prev, customer_id: "" }));
                                }}
                                className="w-full text-start px-3 py-2 rounded-lg text-xs font-semibold text-text-subtle hover:text-foreground hover:bg-surface-subtle transition-all border-none outline-none cursor-pointer flex flex-col"
                              >
                                <span className="font-bold text-foreground">{c.full_name}</span>
                                <span className="text-[10px] text-text-muted mt-0.5">{c.phone}</span>
                              </button>
                            ))}
                            {isFetchingCustomer && <div className="p-2 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>}
                          </>
                        ) : (
                          <div className="p-3 text-center text-xs text-text-muted">
                            {isCustomerSearching ? (
                              <div className="flex justify-center p-1"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
                            ) : (
                              wizardDict.noActiveCustomers || "No active customers found"
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-3 py-2 bg-surface-subtle border border-border-default rounded-xl gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate" title={selectedCustomer.full_name}>{selectedCustomer.full_name}</span>
                      <span className="text-[11px] text-text-muted mt-0.5 truncate">{selectedCustomer.phone}</span>
                    </div>
                    {!bookingId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerSearch("");
                        }}
                        className="h-7 px-3 text-xs font-medium text-text-subtle hover:bg-surface-card hover:text-foreground border border-transparent hover:border-border-default rounded-lg transition-all shrink-0"
                      >
                        {wizardDict.cancel || "Change"}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Service Selection Toggle */}
              <div className="flex flex-col gap-1.5 mt-2">
                <Label className="text-xs font-medium text-text-subtle">{wizardDict.serviceType}</Label>
                <div className="flex gap-1 bg-surface-subtle border border-border-default rounded-xl p-1 h-10 items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setServiceType("custom");
                      setSelectedServiceCategory(null);
                      setSelectedService(null);
                      setErrors(prev => ({ ...prev, category_id: "", service_id: "", service_name: "", service_price: "" }));
                    }}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold cursor-pointer border-none outline-none transition-all ${
                      serviceType === "custom"
                        ? "bg-surface-card text-foreground shadow-sm"
                        : "bg-transparent text-text-muted hover:text-foreground"
                    }`}
                  >
                    {wizardDict.serviceCustom || "Custom Service"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setServiceType("existing");
                      setCustomServiceName("");
                      setErrors(prev => ({ ...prev, category_id: "", service_id: "", service_name: "", service_price: "" }));
                    }}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold cursor-pointer border-none outline-none transition-all ${
                      serviceType === "existing"
                        ? "bg-surface-card text-foreground shadow-sm"
                        : "bg-transparent text-text-muted hover:text-foreground"
                    }`}
                  >
                    {wizardDict.serviceExisting || "Existing Service"}
                  </button>
                </div>
              </div>

              {/* Dynamic Service Fields */}
              {serviceType === "custom" ? (
                <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                  {/* Custom Service Name */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="form-serv-name" className="text-xs font-medium text-text-subtle">{wizardDict.serviceName} <span className="text-destructive">*</span></Label>
                    <Input
                      id="form-serv-name"
                      value={customServiceName}
                      onChange={(e) => {
                        setCustomServiceName(e.target.value);
                        setErrors(prev => ({ ...prev, service_name: "" }));
                      }}
                      placeholder={wizardDict.serviceNamePlaceholder}
                      className="h-10 !rounded-lg text-sm"
                      error={errors.service_name}
                    />
                  </div>

                  {/* Custom Service Price */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="form-custom-price" className="text-xs font-medium text-text-subtle">{wizardDict.servicePrice} <span className="text-destructive">*</span></Label>
                    <Input
                      id="form-custom-price"
                      type="number"
                      value={customPrice}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsed = Number(raw);
                        const val = raw === "" || isNaN(parsed) ? "" : parsed;
                        setCustomPrice(val);
                        setErrors(prev => ({ ...prev, service_price: "" }));
                      }}
                      placeholder={wizardDict.servicePricePlaceholder}
                      className="h-10 !rounded-lg text-sm"
                      error={errors.service_price}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                  {/* ServiceCategory Selection */}
                  <div className="flex flex-col gap-1.5 relative">
                    <Label className="text-xs font-medium text-text-subtle">{wizardDict.categorySelect || "ServiceCategory"} <span className="text-[10px] text-text-muted font-normal ms-1">({(wizardDict as any).optional || "Optional"})</span></Label>
                    
                    {!selectedServiceCategory ? (
                      <div className="relative" ref={categoryRef}>
                        <div className="absolute top-0 bottom-0 start-3 flex items-center pointer-events-none text-text-muted z-10">
                          <Search className="w-4 h-4" />
                        </div>
                        <Input
                          placeholder={wizardDict.categorySelectPlaceholder || "Search category..."}
                          value={categorySearch}
                          onChange={(e) => {
                            setServiceCategorySearch(e.target.value);
                            setIsServiceCategoryDropdownOpen(true);
                          }}
                          onFocus={() => setIsServiceCategoryDropdownOpen(true)}
                          className="h-10 !rounded-lg text-sm w-full ps-9"
                          error={errors.category_id}
                        />
                        {isServiceCategoryDropdownOpen && (
                          <div 
                            className="absolute z-[60] w-full mt-2 max-h-48 overflow-y-auto bg-surface-overlay backdrop-blur-md border border-border-default rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] p-1 flex flex-col gap-0.5"
                            onScroll={(e) => handleScroll(e, fetchNextServiceCategory, !!hasNextServiceCategory, isFetchingServiceCategory)}
                          >
                            {filteredCategories.length > 0 ? (
                              <>
                                {filteredCategories.map(c => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedServiceCategory(c);
                                      setSelectedService(null);
                                      setServiceCategorySearch("");
                                      setIsServiceCategoryDropdownOpen(false);
                                      setErrors(prev => ({ ...prev, category_id: "" }));
                                    }}
                                    className="w-full text-start px-3 py-2 rounded-lg text-xs font-semibold text-text-subtle hover:text-foreground hover:bg-surface-subtle transition-all border-none outline-none cursor-pointer flex flex-col"
                                  >
                                    <span className="font-bold text-foreground">{c.name}</span>
                                    <span className="text-[10px] text-text-muted mt-0.5" dir="ltr">slug: {c.slug}</span>
                                  </button>
                                ))}
                                {isFetchingServiceCategory && <div className="p-2 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>}
                              </>
                            ) : (
                              <div className="p-3 text-center text-xs text-text-muted">
                                {isCategorySearching ? (
                                  <div className="flex justify-center p-1"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
                                ) : (
                                  wizardDict.noActiveCategories || "No active categories found"
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-3 py-2 bg-surface-subtle border border-border-default rounded-xl">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">{selectedServiceCategory.name}</span>
                          <span className="text-[11px] text-text-muted mt-0.5" dir="ltr">slug: {selectedServiceCategory.slug}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedServiceCategory(null);
                            setSelectedService(null);
                            setServiceCategorySearch("");
                          }}
                          className="h-7 px-3 text-xs font-medium text-text-subtle hover:bg-surface-card hover:text-foreground border border-transparent hover:border-border-default rounded-lg transition-all"
                        >
                          {wizardDict.cancel || "Change"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Service Selection */}
                  <div className="flex flex-col gap-1.5 relative">
                    <Label className="text-xs font-medium text-text-subtle">{wizardDict.serviceExisting} <span className="text-destructive">*</span></Label>
                    
                    {!selectedService ? (
                      <div className="relative" ref={serviceRef}>
                        <div className="absolute top-0 bottom-0 start-3 flex items-center pointer-events-none text-text-muted z-10">
                          <Search className="w-4 h-4" />
                        </div>
                        <Input
                          placeholder={wizardDict.serviceSelect || "Search service by Slug..."}
                          value={serviceSearch}
                          onChange={(e) => {
                            setServiceSearch(e.target.value);
                            setIsServiceDropdownOpen(true);
                          }}
                          onFocus={() => setIsServiceDropdownOpen(true)}
                          className="h-10 !rounded-lg text-sm w-full ps-9"
                          error={errors.service_id}
                        />
                        {isServiceDropdownOpen && (
                          <div 
                            className="absolute z-[60] w-full mt-2 max-h-48 overflow-y-auto bg-surface-overlay backdrop-blur-md border border-border-default rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] p-1 flex flex-col gap-0.5"
                            onScroll={(e) => handleScroll(e, fetchNextService, !!hasNextService, isFetchingService)}
                          >
                            {filteredServices.length > 0 ? (
                              <>
                                {filteredServices.map(s => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedService(s);
                                      setServiceSearch("");
                                      setIsServiceDropdownOpen(false);
                                      setErrors(prev => ({ ...prev, service_id: "" }));
                                    }}
                                    className="w-full text-start px-3 py-2 rounded-lg text-xs font-semibold text-text-subtle hover:text-foreground hover:bg-surface-subtle transition-all border-none outline-none cursor-pointer flex flex-col"
                                  >
                                    <span className="font-bold text-foreground">{s.name || s.slug}</span>
                                    <span className="text-[10px] text-text-muted mt-0.5" dir="ltr">slug: {s.slug}</span>
                                  </button>
                                ))}
                                {isFetchingService && <div className="p-2 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>}
                              </>
                            ) : (
                              <div className="p-3 text-center text-xs text-text-muted">
                                {isServiceSearching ? (
                                  <div className="flex justify-center p-1"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
                                ) : (
                                  (wizardDict as any).noActiveServices || "No active services found"
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-3 py-2 bg-surface-subtle border border-border-default rounded-xl">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">{selectedService.name || selectedService.slug}</span>
                          <span className="text-[11px] text-text-muted mt-0.5" dir="ltr">slug: {selectedService.slug}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedService(null);
                            setServiceSearch("");
                          }}
                          className="h-7 px-3 text-xs font-medium text-text-subtle hover:bg-surface-card hover:text-foreground border border-transparent hover:border-border-default rounded-lg transition-all"
                        >
                          {wizardDict.cancel || "Change"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Existing Service Price Override */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="form-existing-price" className="text-xs font-medium text-text-subtle">{wizardDict.servicePrice} <span className="text-destructive">*</span></Label>
                    <Input
                      id="form-existing-price"
                      type="number"
                      value={existingPrice}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsed = Number(raw);
                        const val = raw === "" || isNaN(parsed) ? "" : parsed;
                        setExistingPrice(val);
                        setErrors(prev => ({ ...prev, service_price: "" }));
                      }}
                      placeholder={wizardDict.servicePricePlaceholder}
                      className="h-10 !rounded-lg text-sm"
                      error={errors.service_price}
                    />
                  </div>
                </div>
              )}

              {/* Add Service Button */}
              <Button
                type="button"
                onClick={handleAddService}
                disabled={isAddServiceDisabled}
                className="w-full h-10 mt-2 gap-2 font-bold shadow-sm rounded-xl"
              >
                <Plus size={16} />
                {wizardDict.addService || "Add Service"}
              </Button>

              {/* Selected Services List */}
              {selectedServicesList.length > 0 && (
                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border-subtle">
                  <Label className="text-xs font-medium text-text-subtle mb-1">{(wizardDict as any).selectedServices || "Selected Services"}</Label>
                  {selectedServicesList.map((srv, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-surface-subtle rounded-xl border border-border-default/60 gap-2">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-foreground truncate" title={srv.name}>{srv.name}</span>
                        <span className="text-xs text-text-muted mt-0.5 truncate">
                          ${srv.price} • {srv.type === 'custom' ? (wizardDict.serviceCustomLabel || 'Custom') : (wizardDict.serviceExistingLabel || 'Existing')}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveService(idx)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-full shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {errors.service_id && (
                    <span className="text-[11px] font-medium text-destructive mt-1 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-destructive inline-block" />
                      {errors.service_id}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

              {/* STEP 2: Scheduling Details */}
              {step === 2 && (
                <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Start Date */}
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="form-start-date" className="text-xs font-medium text-text-subtle">{wizardDict.startDate} <span className="text-destructive">*</span></Label>
                      <Input
                        id="form-start-date"
                        type="datetime-local"
                        value={scheduledFrom}
                        onChange={(e) => {
                          setScheduledFrom(e.target.value);
                          setErrors(prev => ({ ...prev, scheduled_from: "", scheduled_to: "" }));
                        }}
                        className="h-10 !rounded-lg text-sm"
                        error={errors.scheduled_from}
                      />
                    </div>

                    {/* End Date */}
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="form-end-date" className="text-xs font-medium text-text-subtle">{wizardDict.endDate} <span className="text-destructive">*</span></Label>
                      <Input
                        id="form-end-date"
                        type="datetime-local"
                        value={scheduledTo}
                        onChange={(e) => {
                          setScheduledTo(e.target.value);
                          setErrors(prev => ({ ...prev, scheduled_to: "" }));
                        }}
                        className="h-10 !rounded-lg text-sm"
                        error={errors.scheduled_to}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Review & Submit */}
              {step === 3 && (
                <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-surface-subtle border border-border-default rounded-xl p-4 flex flex-col gap-3">
                    <span className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-1">{wizardDict.reviewCustomer || "Customer Details"}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-card flex items-center justify-center border border-border-default shadow-sm shrink-0">
                        <span className="font-bold text-sm text-foreground">{selectedCustomer?.full_name?.charAt(0) || "U"}</span>
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-bold text-foreground text-sm truncate">{selectedCustomer?.full_name}</span>
                        <span className="text-xs text-text-muted mt-0.5 truncate">{selectedCustomer?.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-subtle border border-border-default rounded-xl p-4 flex flex-col gap-3">
                    <span className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-1">{wizardDict.reviewService || "Services Details"}</span>
                    <div className="flex flex-col gap-2">
                      {selectedServicesList.map((srv, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm border-b border-border-default/50 pb-2 last:border-b-0 last:pb-0">
                          <span className="font-semibold text-foreground">{srv.name}</span>
                          <span className="font-bold">${srv.price}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center text-sm pt-2 border-t border-border-default font-bold">
                        <span>Total:</span>
                        <span className="text-primary">${selectedServicesList.reduce((acc, curr) => acc + curr.price, 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-subtle border border-border-default rounded-xl p-4 flex flex-col gap-3">
                    <span className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-1">{wizardDict.reviewSchedule || "Schedule"}</span>
                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-muted">{wizardDict.startDate}:</span>
                        <span className="font-semibold text-foreground">{new Date(scheduledFrom).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">{wizardDict.endDate}:</span>
                        <span className="font-semibold text-foreground">{new Date(scheduledTo).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="form-notes" className="text-xs font-medium text-text-subtle">{wizardDict.notes || "Additional Notes"} <span className="text-[10px] text-text-muted font-normal ms-1">({(wizardDict as any).optional || "Optional"})</span></Label>
                    <Textarea
                      id="form-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={wizardDict.notesPlaceholder}
                      className="min-h-[80px] text-sm"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 py-4 border-t border-border-default flex items-center justify-between">
          {!isDetailLoading && (
            <>
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="h-10 px-4 gap-1.5"
                >
                  <ArrowBack size={14} />
                  {wizardDict.back || "Back"}
                </Button>
              ) : (
                <DialogClose render={<Button variant="outline" type="button" className="h-10 px-5" />}>
                  {wizardDict.cancel || "Cancel"}
                </DialogClose>
              )}

              {step < 3 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={step === 1 && !isStep1Valid}
                  className="h-10 px-5 font-semibold gap-1.5"
                >
                  {wizardDict.next || "Next"}
                  <ArrowNext size={14} />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="h-10 px-5 font-semibold gap-1.5"
                >
                  {saving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                  {saving ? ((wizardDict as any).saving || "Saving...") : (bookingId ? ((dict as any).saveChanges || "Save Changes") : ((wizardDict as any).confirm || "Confirm"))}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
