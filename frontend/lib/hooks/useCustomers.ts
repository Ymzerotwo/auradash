import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { CustomerService, type PaginatedCustomers, type CustomerStats, type Customer } from '../services/customer.service';
import { ApiError } from '../api/client';
import { getErrorMessage, getSuccessMessage, extractApiErrors } from '../utils/error';
import { toast } from 'sonner';
import { useTranslation } from '../i18n/LanguageContext';
import { useAuthStore } from '../stores/auth.store';
import { CreateCustomerSchema, UpdateCustomerSchema } from '../validations/customer.schema';
import { extractZodErrors } from '../validations/common.schema';

export const customerKeys = {
  all: ['customers'] as const,
  list: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    [...customerKeys.all, 'list', params] as const,
  stats: () => [...customerKeys.all, 'stats'] as const,
  detail: (id: string) => [...customerKeys.all, 'detail', id] as const,
};

export function useCustomerList(params?: { page?: number; limit?: number; search?: string; status?: string }) {
  return useQuery<PaginatedCustomers, Error>({
    queryKey: customerKeys.list(params),
    queryFn: () => CustomerService.getAll(params),
  });
}

export function useInfiniteCustomerList(params?: { search?: string; status?: string; limit?: number }) {
  const limit = params?.limit || 20;
  return useInfiniteQuery<PaginatedCustomers, Error>({
    queryKey: [...customerKeys.all, 'infinite-list', { ...params, limit }],
    queryFn: ({ pageParam = 1 }) => CustomerService.getAll({ ...params, page: pageParam as number, limit }),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}

export function useCustomerStats() {
  return useQuery<CustomerStats, Error>({
    queryKey: customerKeys.stats(),
    queryFn: () => CustomerService.getStats(),
  });
}

export function useCustomerDetail(id: string) {
  return useQuery<Customer, Error>({
    queryKey: customerKeys.detail(id),
    queryFn: () => CustomerService.getById(id),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: CustomerService.create,
    onSuccess: () => {
      toast.success(getSuccessMessage({ slug: 'CUSTOMER_CREATED' }, t as any, 'customers'));
      qc.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'customers'));
    }
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof CustomerService.update>[1] }) => CustomerService.update(id, data),
    onSuccess: () => {
      toast.success(getSuccessMessage({ slug: 'CUSTOMER_UPDATED' }, t as any, 'customers'));
      qc.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'customers'));
    }
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: CustomerService.delete,
    onSuccess: () => {
      toast.success(getSuccessMessage({ slug: 'CUSTOMER_DELETED' }, t as any, 'customers'));
      qc.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'customers'));
    }
  });
}

export function useSpamCustomer() {
  const qc = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => CustomerService.markAsSpam(id, reason),
    onSuccess: () => {
      toast.success(getSuccessMessage({ slug: 'CUSTOMER_SPAMMED' }, t as any, 'customers'));
      qc.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'customers'));
    }
  });
}

export function useUnspamCustomer() {
  const qc = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: CustomerService.removeFromSpam,
    onSuccess: () => {
      toast.success(getSuccessMessage({ slug: 'CUSTOMER_UNSPAMMED' }, t as any, 'customers'));
      qc.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'customers'));
    }
  });
}

/* ─── UI Hooks ─────────────────────────────────────────────── */

export function useCustomersPage() {
  const { t, locale } = useTranslation();
  const dict = t.customers || {};
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "spam">("all");
  
  const { data: customerData, error: customerError, isLoading: isCustomerLoading } = useCustomerList({ 
    limit: 50,
    search: searchQuery || undefined,
    status: statusFilter
  });
  
  const { data: statsData, isLoading: isStatsLoading } = useCustomerStats();
  
  const spamMutation = useSpamCustomer();
  const unspamMutation = useUnspamCustomer();
  const deleteMutation = useDeleteCustomer();

  const isInitialLoading = isCustomerLoading || isStatsLoading;

  const customers = useMemo(() => customerData?.data ?? [], [customerData]);
  const stats = useMemo(() => ({
    total: statsData?.total ?? 0,
    active: statsData?.active ?? 0,
    spammed: statsData?.spammed ?? 0,
  }), [statsData]);

  const isForbidden = (customerError as { slug?: string; code?: number })?.slug === "FORBIDDEN"
    || (customerError as { code?: number })?.code === 403;

  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  
  const [isSpamModalOpen, setIsSpamModalOpen] = useState(false);
  const [customerToSpam, setCustomerToSpam] = useState<Customer | null>(null);
  const [spamReason, setSpamReason] = useState("");

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const handleToggleStatus = useCallback((customer: Customer) => {
    if (customer.spam) {
      unspamMutation.mutate(customer.id);
    } else {
      setCustomerToSpam(customer);
      setSpamReason("");
      setIsSpamModalOpen(true);
    }
  }, [unspamMutation]);

  const confirmSpam = useCallback(() => {
    if (customerToSpam && spamReason.trim().length >= 3) {
      spamMutation.mutate({ id: customerToSpam.id, reason: spamReason });
      setIsSpamModalOpen(false);
      setCustomerToSpam(null);
    }
  }, [spamMutation, customerToSpam, spamReason]);

  const handleDelete = useCallback((customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (customerToDelete) {
      deleteMutation.mutate(customerToDelete.id);
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
    }
  }, [deleteMutation, customerToDelete]);

  const openAddDialog = useCallback(() => {
    setCustomerToEdit(null);
    setIsFormDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((customer: Customer) => {
    setCustomerToEdit(customer);
    setIsFormDialogOpen(true);
  }, []);

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    }).format(new Date(dateStr));
  };

  const filterTabs: { label: string; value: "all" | "active" | "spam" }[] = [
    { label: dict.search?.filterAll || "All", value: "all" },
    { label: dict.search?.filterActive || "Active", value: "active" },
    { label: dict.search?.filterSpammed || "Spammed", value: "spam" },
  ];

  return {
    dict, router, locale,
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    customers, stats, isCustomerLoading, isStatsLoading, isInitialLoading, isForbidden,
    viewMode, setViewMode, filterTabs,
    isDeleteModalOpen, setIsDeleteModalOpen, customerToDelete, setCustomerToDelete,
    isSpamModalOpen, setIsSpamModalOpen, customerToSpam, setCustomerToSpam, spamReason, setSpamReason,
    isFormDialogOpen, setIsFormDialogOpen, customerToEdit, setCustomerToEdit,
    handleToggleStatus, confirmSpam, handleDelete, confirmDelete, openAddDialog, openEditDialog, formatDate,
    spamMutation, deleteMutation
  };
}

export function useCustomerForm({ open, onOpenChange, customer }: { open: boolean, onOpenChange: (open: boolean) => void, customer?: Customer | null }) {
  const { t } = useTranslation();
  const dict = t.customers || {};

  const isEditing = !!customer;

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [city, setCity] = useState("");
  const [acquisitionSource, setAcquisitionSource] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (customer) {
        setFullName(customer.full_name || "");
        setPhone(customer.phone || "");
        setEmail(customer.email || "");
        setGender((customer.gender as any) || "");
        setDateOfBirth(customer.date_of_birth ? customer.date_of_birth.substring(0, 10) : "");
        setCity(customer.city || "");
        setAcquisitionSource(customer.acquisition_source || "");
        setTags(customer.tags ? customer.tags.join(", ") : "");
        setNotes(customer.notes || "");
      } else {
        setFullName("");
        setPhone("");
        setEmail("");
        setGender("");
        setDateOfBirth("");
        setCity("");
        setAcquisitionSource("");
        setTags("");
        setNotes("");
      }
      setErrors({});
    }
  }, [open, customer]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const tagsArray = tags.split(',').map(s => s.trim()).filter(Boolean);
      
      const payload = {
        full_name: fullName.trim(),
        phone: phone.replace(/[\s\-]/g, ''),
        email: email.trim(),
        gender: gender || undefined,
        date_of_birth: dateOfBirth || undefined,
        city: city.trim() || undefined,
        acquisition_source: acquisitionSource.trim() || undefined,
        tags: tagsArray,
        notes: notes.trim() || undefined,
      };

      const schema = isEditing ? UpdateCustomerSchema : CreateCustomerSchema;
      const result = schema.safeParse(payload);
      if (!result.success) {
        setErrors(extractZodErrors(result.error, t as any, 'common.zod'));
        toast.error(t.common?.zod?.fix_errors || "Please fix the form errors");
        setSaving(false);
        return;
      }
      setErrors({});

      if (isEditing && customer) {
        await updateMutation.mutateAsync({ id: customer.id, data: result.data });
      } else {
        await createMutation.mutateAsync(result.data as any);
      }
      
      onOpenChange(false);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.slug === 'VALIDATION_ERROR' && e.details && e.details.length > 0) {
        const apiErrors = extractApiErrors(e, t as any, 'common.errors');
        if (Object.keys(apiErrors).length > 0) {
          setErrors(apiErrors);
          return;
        }
      }
      console.error("Failed to save customer:", e);
    } finally {
      setSaving(false);
    }
  };

  return {
    dict, isEditing, saving, errors, handleSubmit,
    fullName, setFullName, phone, setPhone, email, setEmail,
    gender, setGender, dateOfBirth, setDateOfBirth, city, setCity,
    acquisitionSource, setAcquisitionSource, tags, setTags, notes, setNotes
  };
}

export function useCustomerDetailView(id: string) {
  const { t, locale } = useTranslation();
  const dict = t.customers || {};
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"services" | "comments">("services");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const { data: customer, isLoading, error } = useCustomerDetail(id);

  return {
    dict, locale, router, activeTab, setActiveTab, viewMode, setViewMode,
    customer, isLoading, error, t
  };
}
