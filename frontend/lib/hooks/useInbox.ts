import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InboxService, type PaginatedInbox, type InboxMessage } from '../services/inbox.service';
import { toast } from 'sonner';
import { ApiError } from '../api/client';
import { getErrorMessage, getSuccessMessage } from '../utils/error';
import { useTranslation } from '../i18n/LanguageContext';

export const inboxKeys = {
  all: ['inbox'] as const,
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    [...inboxKeys.all, 'list', params] as const,
};

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStateStore } from './../stores/state.store';

export function useInboxList(params?: { page?: number; limit?: number; status?: string }) {
  const qc = useQueryClient();
  const notificationsVersion = useStateStore((s) => s.versions.notifications_version);

  useEffect(() => {
    if (notificationsVersion) {
      qc.invalidateQueries({ queryKey: inboxKeys.all });
    }
  }, [notificationsVersion, qc]);

  return useQuery<PaginatedInbox, ApiError>({
    queryKey: inboxKeys.list(params),
    queryFn: () => InboxService.getAll(params),
  });
}


export function useUpdateInboxStatus() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, status, spam_reason }: { id: string; status: string; spam_reason?: string }) => 
      InboxService.updateStatus(id, status, spam_reason),
    onMutate: async ({ id, status, spam_reason }) => {
      // 1. Cancel any outgoing refetches to prevent optimistic update flicker
      await qc.cancelQueries({ queryKey: inboxKeys.all });
      
      // 2. Snapshot previous values
      const previousQueries = qc.getQueriesData<PaginatedInbox>({ queryKey: ['inbox', 'list'] });
      const previousCounters = useStateStore.getState().counters;

      let wasUnread = false;
      for (const [, oldData] of previousQueries) {
        const targetMsg = oldData?.messages?.find((m) => m.id === id);
        if (targetMsg) {
          wasUnread = targetMsg.status === 'unread';
          break;
        }
      }
      
      // 3. Optimistically update all lists containing this message
      qc.setQueriesData<PaginatedInbox>({ queryKey: ['inbox', 'list'] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map((m) => {
            if (m.id === id) {
              return { 
                ...m, 
                status: status as InboxMessage['status'],
                spam_reason: spam_reason || m.spam_reason
              };
            }
            return m;
          }),
        };
      });

      // 4. Optimistically update global unread count badge in useStateStore
      if (wasUnread && status !== 'unread') {
        useStateStore.getState().setCounters({
          inbox: Math.max(0, (previousCounters.inbox || 0) - 1),
        });
      } else if (!wasUnread && status === 'unread') {
        useStateStore.getState().setCounters({
          inbox: (previousCounters.inbox || 0) + 1,
        });
      }

      return { previousQueries, previousCounters };
    },
    onError: (error: unknown, _variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, oldData]) => {
          qc.setQueryData(queryKey, oldData);
        });
      }
      if (context?.previousCounters) {
        useStateStore.getState().setCounters(context.previousCounters);
      }
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'inbox'));
    },
    onSuccess: () => {
      toast.success(getSuccessMessage({ slug: 'THREAD_UPDATED' }, t as any, 'inbox'));
    },
    onSettled: async () => {
      // Re-fetch to get exact server state
      void qc.invalidateQueries({ queryKey: inboxKeys.all });
      try {
        const counters = await InboxService.getUnreadCount();
        if (typeof counters?.count === 'number') {
          useStateStore.getState().setCounters({ inbox: counters.count });
        }
      } catch {}
    },
  });
}

export function useDeleteInboxMessage() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => InboxService.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: inboxKeys.all });
      
      const previousQueries = qc.getQueriesData<PaginatedInbox>({ queryKey: ['inbox', 'list'] });
      const previousCounters = useStateStore.getState().counters;

      let wasUnread = false;
      for (const [, oldData] of previousQueries) {
        const targetMsg = oldData?.messages?.find((m) => m.id === id);
        if (targetMsg) {
          wasUnread = targetMsg.status === 'unread';
          break;
        }
      }
      
      qc.setQueriesData<PaginatedInbox>({ queryKey: ['inbox', 'list'] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.filter((m) => m.id !== id),
        };
      });

      if (wasUnread) {
        useStateStore.getState().setCounters({
          inbox: Math.max(0, (previousCounters.inbox || 0) - 1),
        });
      }

      return { previousQueries, previousCounters };
    },
    onError: (error: unknown, _id, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, oldData]) => {
          qc.setQueryData(queryKey, oldData);
        });
      }
      if (context?.previousCounters) {
        useStateStore.getState().setCounters(context.previousCounters);
      }
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'inbox'));
    },
    onSuccess: (_, id) => {
      toast.success(getSuccessMessage({ slug: 'THREAD_DELETED' }, t as any, 'inbox'));
    },
    onSettled: async () => {
      void qc.invalidateQueries({ queryKey: inboxKeys.all });
      try {
        const counters = await InboxService.getUnreadCount();
        if (typeof counters?.count === 'number') {
          useStateStore.getState().setCounters({ inbox: counters.count });
        }
      } catch {}
    },
  });
}

export function useInboxPage() {
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [page, setPage] = useState(1);
  const limit = 20;

  const [actionMessageId, setActionMessageId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSpamOpen, setIsSpamOpen] = useState(false);
  const [spamReason, setSpamReason] = useState("");

  const [viewMessage, setViewMessage] = useState<{ 
    id: string; 
    content: string; 
    author: string; 
    inquiry_type?: string;
    metadata?: any;
    read_at?: string;
    read_by?: string;
    read_by_name?: string;
    converted_at?: string;
    converted_by?: string;
    converted_by_name?: string;
    profile_created_at?: string;
    profile_created_by?: string;
    profile_created_by_name?: string;
    add_to_spam_at?: string;
    add_to_spam_by?: string;
    add_to_spam_by_name?: string;
    spam_reason?: string;
  } | null>(null);

  const searchParams = useSearchParams();
  const highlightedId = searchParams.get("highlight") || searchParams.get("id");

  const { data, isLoading } = useInboxList({ page, limit, status: filterStatus });
  const updateStatusMutation = useUpdateInboxStatus();
  const deleteMutation = useDeleteInboxMessage();

  useEffect(() => {
    if (highlightedId && data?.messages) {
      setTimeout(() => {
        const element = document.getElementById(`message-${highlightedId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500);
    }
  }, [highlightedId, data]);

  const messages = data?.messages || [];
  const filteredMessages = messages.filter(m => 
    m.full_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || 
    (m.email && m.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) ||
    m.phone.includes(debouncedSearchQuery)
  );

  const handleUpdateStatus = async (id: string, status: string, reason?: string) => {
    await updateStatusMutation.mutateAsync({ id, status, spam_reason: reason });
  };

  const handleSpamConfirm = async () => {
    if (actionMessageId) {
      await handleUpdateStatus(actionMessageId, 'spam', spamReason);
    }
    setIsSpamOpen(false);
    setActionMessageId(null);
    setSpamReason("");
  };

  const handleDeleteConfirm = async () => {
    if (actionMessageId) {
      await deleteMutation.mutateAsync(actionMessageId);
    }
    setIsDeleteOpen(false);
    setActionMessageId(null);
  };

  return {
    state: {
      viewMode,
      filterStatus,
      searchQuery,
      debouncedSearchQuery,
      page,
      limit,
      actionMessageId,
      isDeleteOpen,
      isSpamOpen,
      spamReason,
      viewMessage,
      highlightedId,
      isLoading,
      isDeleting: deleteMutation.isPending || (deleteMutation as any).isLoading,
      messages,
      filteredMessages,
      data,
    },
    setters: {
      setViewMode,
      setFilterStatus,
      setSearchQuery,
      setPage,
      setActionMessageId,
      setIsDeleteOpen,
      setIsSpamOpen,
      setSpamReason,
      setViewMessage,
    },
    handlers: {
      handleUpdateStatus,
      handleSpamConfirm,
      handleDeleteConfirm,
    }
  };
}
