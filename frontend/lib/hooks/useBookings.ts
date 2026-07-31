import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookingService, type Booking, type PaginatedBookings } from '../services/booking.service';
import { toast } from 'sonner';
import { ApiError } from '../api/client';
import { getErrorMessage, getSuccessMessage } from '../utils/error';
import { useTranslation } from '../i18n/LanguageContext';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../stores/auth.store';
import { format, differenceInMinutes } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useInfiniteCustomerList } from './useCustomers';
import { useInfiniteServiceCategoryList } from './useServiceCategories';
import { useInfiniteServiceList } from './useServices';
import { type Customer } from '../services/customer.service';
import { type ServiceCategory } from '../services/service-category.service';
import { type ServiceData } from '../services/service.service';

const localizeNumber = (str: string | number, loc: string) => {
  if (loc !== "ar") return String(str);
  const arabicNumbers = ['\u0660', '\u0661', '\u0662', '\u0663', '\u0664', '\u0665', '\u0666', '\u0667', '\u0668', '\u0669'];
  return String(str).replace(/\d/g, d => arabicNumbers[parseInt(d)]);
};

/* ─── Query Keys ──────────────────────────────────────────── */
export const bookingKeys = {
  all: ['bookings'] as const,
  list: (params?: { search?: string; page?: number; limit?: number; status?: string }) =>
    [...bookingKeys.all, 'list', params] as const,
  detail: (id: string) => [...bookingKeys.all, 'detail', id] as const,
};

/* ─── API Hooks ───────────────────────────────────────────── */

export function useBookingsList(params?: { search?: string; page?: number; limit?: number; status?: string }) {
  return useQuery<PaginatedBookings, ApiError>({
    queryKey: bookingKeys.list(params),
    queryFn: () => BookingService.getAll(params),
  });
}

export function useBookingDetail(id: string) {
  return useQuery<Booking, ApiError>({
    queryKey: bookingKeys.detail(id),
    queryFn: () => BookingService.getById(id),
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: (data: any) => BookingService.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bookingKeys.all });
      toast.success(getSuccessMessage({ slug: 'BOOKING_CREATED' }, t as any, 'bookings'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'bookings'));
    },
  });
}

export function useUpdateBooking() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => BookingService.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bookingKeys.all });
      toast.success(getSuccessMessage({ slug: 'BOOKING_UPDATED' }, t as any, 'bookings'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'bookings'));
    },
  });
}

export function useChangeBookingStatus() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => BookingService.changeStatus(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bookingKeys.all });
      toast.success(getSuccessMessage({ slug: 'BOOKING_STATUS_CHANGED' }, t as any, 'bookings'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'bookings'));
    },
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: (id: string) => BookingService.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bookingKeys.all });
      toast.success(getSuccessMessage({ slug: 'BOOKING_DELETED' }, t as any, 'bookings'));
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, t as any, 'bookings'));
    },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { amount: number; notes?: string } }) => BookingService.recordPayment(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bookingKeys.all });
      const dict = (t as any).bookings || {};
      toast.success(dict.paymentSuccess || 'Payment recorded successfully');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, t as any, 'bookings'));
    },
  });
}

/* ─── UI Page Hooks ───────────────────────────────────────── */

export function useBookingsPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const dict = t.bookings;
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

  const { data, isLoading } = useBookingsList({ page, limit, status: filterStatus, search: searchQuery });

  const deleteMutation = useDeleteBooking();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);

  const bookings = data?.data || [];
  
  const filteredBookings = bookings.filter((b) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      (b.customer_name?.toLowerCase() || "").includes(query) || 
      (b.customer_phone || "").includes(query) ||
      (b.customer_email?.toLowerCase() || "").includes(query) ||
      (b.booking_number?.toLowerCase() || "").includes(query)
    );
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending": return "secondary";
      case "in_progress": return "default";
      case "completed": return "success";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  const getPaymentBadgeVariant = (status: string) => {
    switch (status) {
      case "paid": return "success";
      case "partial": return "warning";
      case "unpaid": return "destructive";
      case "refunded": return "secondary";
      default: return "outline";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return (dict as any)?.notScheduled || "Not Scheduled";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime()) || date.getFullYear() === 1970) return (dict as any)?.notScheduled || "Not Scheduled";
      const formatted = format(date, "dd/MM/yyyy, hh:mm a", {
        locale: locale === "ar" ? ar : enUS,
      });
      return localizeNumber(formatted, locale);
    } catch (e) {
      return "Invalid Date";
    }
  };

  const formatDateRange = (startString: string | null, endString: string | null) => {
    if (!startString || !endString) return (dict as any)?.notScheduled || "Not Scheduled";
    try {
      const start = new Date(startString);
      const end = new Date(endString);
      if (isNaN(start.getTime()) || start.getFullYear() === 1970) return (dict as any)?.notScheduled || "Not Scheduled";
      if (isNaN(end.getTime()) || end.getFullYear() === 1970) return (dict as any)?.notScheduled || "Not Scheduled";
      
      const dateLocale = locale === "ar" ? ar : enUS;
      const isSameDay = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate();
        
      if (locale === "ar") {
        if (isSameDay) {
          const datePart = format(start, "dd/MM/yyyy", { locale: dateLocale });
          const startTime = format(start, "hh:mm a", { locale: dateLocale });
          const endTime = format(end, "hh:mm a", { locale: dateLocale });
          return `${localizeNumber(datePart, locale)}, ${localizeNumber(startTime, locale)} ← ${localizeNumber(endTime, locale)}`;
        } else {
          const startFormatted = format(start, "dd/MM/yyyy, hh:mm a", { locale: dateLocale });
          const endFormatted = format(end, "dd/MM/yyyy, hh:mm a", { locale: dateLocale });
          return `${localizeNumber(startFormatted, locale)} ← ${localizeNumber(endFormatted, locale)}`;
        }
      } else {
        if (isSameDay) {
          const datePart = format(start, "dd/MM/yyyy", { locale: dateLocale });
          const startTime = format(start, "hh:mm a", { locale: dateLocale });
          const endTime = format(end, "hh:mm a", { locale: dateLocale });
          return `${datePart}, ${startTime} → ${endTime}`;
        } else {
          const startFormatted = format(start, "dd/MM/yyyy, hh:mm a", { locale: dateLocale });
          const endFormatted = format(end, "dd/MM/yyyy, hh:mm a", { locale: dateLocale });
          return `${startFormatted} → ${endFormatted}`;
        }
      }
    } catch (e) {
      return "Invalid Date";
    }
  };

  const handleCreateBooking = () => setIsCreateOpen(true);
  const handleEditBooking = (id: string) => setEditingBookingId(id);
  const handleDeleteBooking = (id: string) => {
    setBookingToDelete(id);
    setIsDeleteModalOpen(true);
  };
  const confirmDelete = () => {
    if (bookingToDelete) {
      deleteMutation.mutate(bookingToDelete, {
        onSuccess: () => {
          setIsDeleteModalOpen(false);
          setBookingToDelete(null);
        }
      });
    }
  };

  const changeStatusMutation = useChangeBookingStatus();
  
  const handleConfirmBooking = (id: string) => {
    changeStatusMutation.mutate({ id, data: { status: "in_progress" } });
  };
  
  const handleCompleteBooking = (id: string) => {
    changeStatusMutation.mutate({ id, data: { status: "completed" } });
  };
  
  const handleCancelBooking = (id: string) => {
    changeStatusMutation.mutate({ id, data: { status: "cancelled" } });
  };

  return {
    router, dict, user, hasPermission, locale,
    viewMode, setViewMode,
    filterStatus, setFilterStatus,
    searchQuery, setSearchQuery,
    page, setPage,
    isCreateOpen, setIsCreateOpen,
    editingBookingId, setEditingBookingId,
    isLoading, filteredBookings,
    getStatusBadgeVariant, getPaymentBadgeVariant,
    formatDate, formatDateRange,
    deleteMutation, isDeleteModalOpen, setIsDeleteModalOpen,
    bookingToDelete, setBookingToDelete,
    handleCreateBooking, handleEditBooking, handleDeleteBooking, confirmDelete,
    changeStatusMutation, handleConfirmBooking, handleCompleteBooking, handleCancelBooking
  };
}

export function useBookingForm({ open, onOpenChange, bookingId }: { open: boolean, onOpenChange: (open: boolean) => void, bookingId?: string }) {
  const { t, locale } = useTranslation();
  const dict = t.bookings || {};
  const wizardDict = dict.wizard || {};
  const errorsDict = wizardDict.errors || {};

  const createMutation = useCreateBooking();
  const updateMutation = useUpdateBooking();
  const { data: bookingDetail, isLoading: isDetailLoading } = useBookingDetail(bookingId || "");

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [categorySearch, setServiceCategorySearch] = useState("");
  const [isServiceCategoryDropdownOpen, setIsServiceCategoryDropdownOpen] = useState(false);
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<ServiceCategory | null>(null);

  const [serviceType, setServiceType] = useState<"custom" | "existing">("custom");
  const [serviceSearch, setServiceSearch] = useState("");
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceData | null>(null);

  const [customServiceName, setCustomServiceName] = useState("");
  const [customPrice, setCustomPrice] = useState<number | "">("");
  const [existingPrice, setExistingPrice] = useState<number | "">("");
  const [customServiceDescription, setCustomServiceDescription] = useState("");

  const [scheduledFrom, setScheduledFrom] = useState("");
  const [scheduledTo, setScheduledTo] = useState("");
  const [notes, setNotes] = useState("");

  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState("");
  const [debouncedCategorySearch, setDebouncedCategorySearch] = useState("");
  const [debouncedServiceSearch, setDebouncedServiceSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCustomerSearch(customerSearch), 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCategorySearch(categorySearch), 300);
    return () => clearTimeout(timer);
  }, [categorySearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedServiceSearch(serviceSearch), 300);
    return () => clearTimeout(timer);
  }, [serviceSearch]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [selectedServicesList, setSelectedServicesList] = useState<any[]>([]);

  const handleAddService = () => {
    const newErrors: Record<string, string> = {};

    if (serviceType === "custom") {
      if (!customServiceName.trim()) newErrors.service_name = errorsDict.nameRequired || "Service name is required.";
      if (customPrice === "" || Number(customPrice) < 0) newErrors.service_price = errorsDict.priceRequired || "Valid price is required.";
    } else {
      if (!selectedService) {
        newErrors.service_id = errorsDict.serviceRequired || "Service selection is required.";
      } else {
        const missing = [];
        let metaData: any[] = [];
        if (typeof selectedService.meta_data === 'string') {
          try { metaData = JSON.parse(selectedService.meta_data); } catch (e) {}
        } else if (Array.isArray(selectedService.meta_data)) {
          metaData = selectedService.meta_data;
        }

        const priceData = metaData.find((f: any) => f.label?.toLowerCase() === 'price')?.data?.text;
        const nameData = metaData.find((f: any) => f.label?.toLowerCase() === 'name')?.data?.text;
        
        if (!nameData && !selectedService.name) missing.push(wizardDict.missingName || "name");
        if (priceData == null || priceData === "") missing.push(wizardDict.missingPrice || "price");

        if (missing.length > 0) {
          newErrors.service_id = `${wizardDict.cannotSelectService || "Cannot select this service"} - ${wizardDict.missingFields || "Missing fields"}: ${missing.join(", ")}`;
        }
      }
      if (existingPrice === "" || Number(existingPrice) < 0) newErrors.service_price = errorsDict.priceRequired || "Valid price is required.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }

    const activePrice = serviceType === "custom" ? customPrice : existingPrice;
    const roundedPrice = activePrice !== "" ? Math.round((Number(activePrice) + Number.EPSILON) * 100) / 100 : 0;
    const newService = serviceType === "custom"
      ? { type: "custom", name: customServiceName.trim(), price: roundedPrice, discount: 0 }
      : { type: "existing", service_id: selectedService?.id, name: selectedService?.name, price: roundedPrice, discount: 0 };

    setSelectedServicesList(prev => [...prev, newService]);

    setCustomServiceName("");
    setCustomPrice("");
    setExistingPrice("");
    setSelectedService(null);
    setSelectedServiceCategory(null);
    setServiceSearch("");
    setServiceCategorySearch("");
    setErrors(prev => ({ ...prev, service_name: "", service_id: "", service_price: "" }));
  };

  const handleRemoveService = (index: number) => {
    setSelectedServicesList(prev => prev.filter((_, i) => i !== index));
  };

  const customerRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) setIsCustomerDropdownOpen(false);
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setIsServiceCategoryDropdownOpen(false);
      if (serviceRef.current && !serviceRef.current.contains(e.target as Node)) setIsServiceDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: customerData, fetchNextPage: fetchNextCustomer, hasNextPage: hasNextCustomer, isFetchingNextPage: isFetchingCustomer, isFetching: isFetchingCustomerList } = useInfiniteCustomerList({ search: debouncedCustomerSearch, limit: 20 });
  const { data: categoryData, fetchNextPage: fetchNextServiceCategory, hasNextPage: hasNextServiceCategory, isFetchingNextPage: isFetchingServiceCategory, isFetching: isFetchingCategoryList } = useInfiniteServiceCategoryList({ search: debouncedCategorySearch, limit: 20 });
  const { data: serviceData, fetchNextPage: fetchNextService, hasNextPage: hasNextService, isFetchingNextPage: isFetchingService, isFetching: isFetchingServiceList } = useInfiniteServiceList({ category_id: selectedServiceCategory?.id, search: debouncedServiceSearch, limit: 20 });

  const isCustomerSearching = isFetchingCustomerList || customerSearch !== debouncedCustomerSearch;
  const isCategorySearching = isFetchingCategoryList || categorySearch !== debouncedCategorySearch;
  const isServiceSearching = isFetchingServiceList || serviceSearch !== debouncedServiceSearch;

  const activeCustomers = useMemo(() => {
    const list = customerData?.pages.flatMap(p => p.data) || [];
    return list.filter(c => !c.spam);
  }, [customerData]);
  const filteredCustomers = activeCustomers;

  const filteredCategories = useMemo(() => categoryData?.pages.flatMap(p => p.categories) || [], [categoryData]);
  const filteredServices = useMemo(() => serviceData?.pages.flatMap(p => p.services) || [], [serviceData]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, fetchNext: () => void, hasNext: boolean, isFetching: boolean) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 20) {
      if (hasNext && !isFetching) fetchNext();
    }
  };

  useEffect(() => {
    if (open && bookingId && bookingDetail) {
      setStep(1);
      setSelectedCustomer({ id: bookingDetail.customer_id, full_name: bookingDetail.customer_name || "", phone: bookingDetail.customer_phone || "", email: bookingDetail.customer_email || "" } as any);

      if (Array.isArray(bookingDetail.services_data)) {
        setSelectedServicesList(bookingDetail.services_data.map(srv => ({
          type: srv.service_id ? "existing" : "custom",
          service_id: srv.service_id || undefined,
          name: srv.name,
          price: srv.price,
          discount: srv.discount || 0
        })));
      }

      const formatForInput = (dateStr: string) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "";
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
      };

      setScheduledFrom(formatForInput(bookingDetail.scheduled_from));
      setScheduledTo(formatForInput(bookingDetail.scheduled_to));
      setNotes(bookingDetail.notes || "");
      setErrors({});
    }
  }, [open, bookingId, bookingDetail]);

  useEffect(() => {
    if (open && !bookingId) {
      setStep(1);
      setSelectedCustomer(null);
      setCustomerSearch("");
      setSelectedServiceCategory(null);
      setServiceCategorySearch("");
      setServiceType("custom");
      setSelectedService(null);
      setServiceSearch("");
      setCustomServiceName("");
      setCustomPrice("");
      setExistingPrice("");
      setCustomServiceDescription("");
      setScheduledFrom("");
      setScheduledTo("");
      setNotes("");
      setDebouncedCustomerSearch("");
      setDebouncedCategorySearch("");
      setDebouncedServiceSearch("");
      setSelectedServicesList([]);
      setErrors({});
    }
  }, [open, bookingId]);

  const handleNext = () => {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
      if (!selectedCustomer) newErrors.customer_id = errorsDict.customerRequired || "Customer is required.";
      if (selectedServicesList.length === 0) newErrors.service_id = errorsDict.atLeastOneService || "At least one service must be added to the booking.";
      if (Object.keys(newErrors).length > 0) return setErrors(newErrors);
    } else if (step === 2) {
      if (!scheduledFrom) newErrors.scheduled_from = errorsDict.startDateRequired || "Start date is required.";
      if (!scheduledTo) newErrors.scheduled_to = errorsDict.endDateRequired || "End date is required.";
      if (scheduledFrom && scheduledTo && new Date(scheduledFrom) >= new Date(scheduledTo)) {
        newErrors.scheduled_to = errorsDict.endDateAfterStart || "End date must be after start date.";
      }
      if (Object.keys(newErrors).length > 0) return setErrors(newErrors);
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, 3) as 1 | 2 | 3);
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1) as 1 | 2 | 3);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const services = selectedServicesList.map(s => {
        if (s.type === 'existing') {
          return { service_id: s.service_id, name: s.name, price: s.price, discount: s.discount || 0 };
        } else {
          return { name: s.name, price: s.price, discount: s.discount || 0 };
        }
      });

      const payload = {
        scheduled_from: new Date(scheduledFrom).toISOString(),
        scheduled_to: new Date(scheduledTo).toISOString(),
        services_data: services,
        notes: notes || undefined,
      };

      if (bookingId) {
        await updateMutation.mutateAsync({ id: bookingId, data: payload });
      } else {
        await createMutation.mutateAsync({ customer_id: selectedCustomer?.id, ...payload });
      }
      onOpenChange(false);
    } catch (e) {
      console.error("Failed to save booking:", e);
    } finally {
      setSaving(false);
    }
  };

  const isRtl = locale === "ar";
  const isStep1Valid = !!selectedCustomer && selectedServicesList.length > 0;
  const isAddServiceDisabled = serviceType === "custom"
    ? (!customServiceName.trim() || customPrice === "" || customPrice < 0)
    : (!selectedService || existingPrice === "" || existingPrice < 0);

  return {
    dict, wizardDict, errorsDict, isRtl, locale,
    step, setStep, handleNext, handleBack, handleSubmit, saving,
    errors, setErrors,
    customerSearch, setCustomerSearch, isCustomerDropdownOpen, setIsCustomerDropdownOpen, selectedCustomer, setSelectedCustomer,
    categorySearch, setServiceCategorySearch, isServiceCategoryDropdownOpen, setIsServiceCategoryDropdownOpen, selectedServiceCategory, setSelectedServiceCategory,
    serviceType, setServiceType, serviceSearch, setServiceSearch, isServiceDropdownOpen, setIsServiceDropdownOpen, selectedService, setSelectedService,
    customServiceName, setCustomServiceName, customPrice, setCustomPrice, existingPrice, setExistingPrice, customServiceDescription, setCustomServiceDescription,
    scheduledFrom, setScheduledFrom, scheduledTo, setScheduledTo, notes, setNotes,
    selectedServicesList, handleAddService, handleRemoveService,
    customerRef, categoryRef, serviceRef,
    filteredCustomers, fetchNextCustomer, hasNextCustomer, isFetchingCustomer, isCustomerSearching,
    filteredCategories, fetchNextServiceCategory, hasNextServiceCategory, isFetchingServiceCategory, isCategorySearching,
    filteredServices, fetchNextService, hasNextService, isFetchingService, isServiceSearching,
    handleScroll, isDetailLoading, isStep1Valid, isAddServiceDisabled
  };
}

export function useBookingDetailView(id: string) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const dict = t.bookings || {};
  const wizardDict = dict.wizard || {};

  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "Admin";

  const { data: booking, isLoading, isError } = useBookingDetail(id);
  const changeStatusMutation = useChangeBookingStatus();
  const deleteMutation = useDeleteBooking();
  const recordPaymentMutation = useRecordPayment();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const isRtl = locale === "ar";
  const dateLocale = isRtl ? ar : enUS;

  const handleRecordPayment = async () => {
    const amountNum = Number(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error((t as any)?.messages?.invalidAmount || "Please enter a valid amount");
      return;
    }
    try {
      await recordPaymentMutation.mutateAsync({
        id: booking?.id || id,
        data: { amount: amountNum, notes: paymentNotes }
      });
      setIsPaymentDialogOpen(false);
      setPaymentAmount("");
      setPaymentNotes("");
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmBooking = async () => {
    try {
      await changeStatusMutation.mutateAsync({
        id: booking?.id || id,
        data: { status: "in_progress" }
      });
      toast.success((t as any)?.messages?.bookingConfirmed || "Booking confirmed successfully");
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteBooking = async () => {
    try {
      await changeStatusMutation.mutateAsync({
        id: booking?.id || id,
        data: { status: "completed" }
      });
      toast.success((t as any)?.messages?.bookingCompleted || "Booking completed successfully");
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmCancel = async () => {
    try {
      await changeStatusMutation.mutateAsync({
        id: booking?.id || id,
        data: { status: "cancelled", cancellation_reason: cancellationReason }
      });
      toast.success((t as any)?.messages?.bookingCancelled || "Booking cancelled successfully");
      setIsCancelDialogOpen(false);
      setCancellationReason("");
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDelete = () => {
    if (!booking) return;
    deleteMutation.mutate(booking.id, {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        router.push("/bookings");
      }
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending": return "secondary";
      case "in_progress": return "default";
      case "completed": return "success";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  const getPaymentBadgeVariant = (status: string) => {
    switch (status) {
      case "paid": return "success";
      case "partial": return "warning";
      case "unpaid": return "destructive";
      case "refunded": return "secondary";
      default: return "outline";
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return dict.notScheduled;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime()) || d.getFullYear() === 1970) {
        return dict.notScheduled;
      }
      return localizeNumber(format(d, "dd/MM/yyyy, hh:mm a", { locale: dateLocale }), locale);
    } catch (e) {
      return dict.notScheduled;
    }
  };

  const durationMinutes = (booking && booking.scheduled_from && booking.scheduled_to) ? (() => {
    const start = new Date(booking.scheduled_from);
    const end = new Date(booking.scheduled_to);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start.getFullYear() === 1970 || end.getFullYear() === 1970) {
      return null;
    }
    return differenceInMinutes(end, start);
  })() : null;

  const formatDuration = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return dict.notScheduled;
    if (minutes < 60) return localizeNumber(`${minutes} ${(dict as any).minutes || "min"}`, locale);
    if (minutes >= 1440) {
      const days = Math.round((minutes / 1440) * 10) / 10;
      return localizeNumber(`${days} ${(dict as any).days || "days"}`, locale);
    }
    const hours = Math.round((minutes / 60) * 10) / 10;
    return localizeNumber(`${hours} ${(dict as any).hours || "hrs"}`, locale);
  };

  return {
    router, dict, wizardDict, isAdmin, booking, isLoading, isError,
    changeStatusMutation, deleteMutation, recordPaymentMutation,
    isEditOpen, setIsEditOpen,
    isDeleteModalOpen, setIsDeleteModalOpen,
    isCancelDialogOpen, setIsCancelDialogOpen,
    cancellationReason, setCancellationReason,
    isPaymentDialogOpen, setIsPaymentDialogOpen,
    paymentAmount, setPaymentAmount,
    paymentNotes, setPaymentNotes,
    isRtl, dateLocale, locale,
    handleRecordPayment, handleConfirmBooking, handleCompleteBooking, handleConfirmCancel, confirmDelete,
    getStatusBadgeVariant, getPaymentBadgeVariant, formatDate, durationMinutes, formatDuration
  };
}
