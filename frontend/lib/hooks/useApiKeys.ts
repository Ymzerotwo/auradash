/**
 * ==========================================
 *        AuraDash API Key Hooks
 * ==========================================
 * 
 * React Query hooks for managing API Keys state, creation, and deletion.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { ApiKeyService, CreateApiKeyRequest, ApiKey, CreateApiKeyResponse } from '../services/apikey.service';
import { ApiError } from '../api/client';
import { getErrorMessage, getSuccessMessage, extractZodErrors, extractApiErrors } from '../utils/error';
import { getApiKeySchema } from '../validations/apikey.schema';
import { useTranslation } from '../i18n/LanguageContext';
import { toast } from 'sonner';

/**
 * Hook to retrieve the list of API Keys with pagination.
 * 
 * @param page - Current active page.
 * @param limit - Page size.
 */
export const useApiKeys = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: ['apikeys', page, limit],
    queryFn: () => ApiKeyService.getApiKeys(page, limit),
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook to handle API Key creation.
 * Automatically invalidates cache queries for API keys on success.
 */
export const useCreateApiKey = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<CreateApiKeyResponse, Error, CreateApiKeyRequest>({
    mutationFn: ApiKeyService.createApiKey,
    onSuccess: () => {
      toast.success(getSuccessMessage({ slug: 'API_KEY_CREATED' }, t as any, 'apikeys'));
      // Invalidate the cache to trigger a fresh fetch and handle pagination correctly
      queryClient.invalidateQueries({ queryKey: ['apikeys'] });
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'apikeys'));
    },
  });
};

/**
 * Hook to handle API Key deletion (revocation).
 * Automatically invalidates cache queries on success.
 */
export const useDeleteApiKey = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<void, Error, string>({
    mutationFn: ApiKeyService.deleteApiKey,
    onSuccess: (_, id) => {
      // Create a dummy response object to pass to getSuccessMessage
      toast.success(getSuccessMessage({ slug: 'API_KEY_DELETED' }, t as any, 'apikeys'));
      // Remove from cache (invalidate to be safe across all pages)
      queryClient.invalidateQueries({ queryKey: ['apikeys'] });
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'apikeys'));
    },
  });
};

/**
 * Custom hook to manage state and actions for the API Keys list page.
 * Keeps presentational components pure and focused only on rendering.
 */
export const useApiKeysPageState = () => {
  const [page, setPage] = useState(1);
  const { data: response, isLoading, isError, error: apiKeysError } = useApiKeys(page, 20);
  const keys = response?.data;
  const pagination = response?.pagination;
  const deleteMutation = useDeleteApiKey();
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);

  const handleDeleteConfirm = (onSuccessCallback?: () => void) => {
    if (!keyToDelete) return;
    
    deleteMutation.mutate(keyToDelete, {
      onSuccess: () => {
        setKeyToDelete(null);
        if (keys?.length === 1 && page > 1) {
          setPage(page - 1);
        }
        if (onSuccessCallback) onSuccessCallback();
      },
      onError: () => {
        setKeyToDelete(null);
      }
    });
  };

  return {
    page,
    setPage,
    keys,
    pagination,
    isLoading,
    isError,
    apiKeysError,
    keyToDelete,
    setKeyToDelete,
    handleDeleteConfirm,
    isDeletePending: deleteMutation.isPending
  };
};

/**
 * Custom hook to manage state, validation, copy functionality, and submission
 * for the Create API Key dialog. Decouples UI form from business logic.
 */
export const useCreateApiKeyForm = (
  onOpenChange: (open: boolean) => void,
  onCreated?: (key: CreateApiKeyResponse) => void
) => {
  const { t } = useTranslation();
  const createMutation = useCreateApiKey();
  const [copied, setCopied] = useState(false);

  const [type, setType] = useState<'production' | 'test'>("production");
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [expiresInHours, setExpiresInHours] = useState<number>(24);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const schema = getApiKeySchema();

  const reset = () => {
    setName("");
    setDomain("");
    setType("production");
    setExpiresInHours(24);
    setErrors({});
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const payload: any = { type, name };
    if (type === 'production') {
      payload.domain = domain;
    } else {
      payload.expiresInHours = expiresInHours;
    }

    const result = schema.safeParse(payload);
    if (!result.success) {
      setErrors(extractZodErrors(result.error, t, 'apikeys.errors'));
      return;
    }

    try {
      const res = await createMutation.mutateAsync(result.data);
      reset();
      onOpenChange(false);
      if (onCreated) {
        onCreated(res);
      }
    } catch (e: unknown) {
      if (e instanceof ApiError && e.slug === 'VALIDATION_ERROR' && e.details && e.details.length > 0) {
        const apiErrors = extractApiErrors(e, t as any, 'apikeys.errors');
        if (Object.keys(apiErrors).length > 0) {
          setErrors(apiErrors);
          return;
        }
      }
      console.error("Failed to save:", e);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return {
    type,
    setType,
    name,
    setName,
    domain,
    setDomain,
    expiresInHours,
    setExpiresInHours,
    errors,
    onSubmit,
    handleClose,
    isPending: createMutation.isPending
  };
};
