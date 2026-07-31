import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { replyCommentSchema } from '../validations/comment.schema';
import { CommentsService, type Comment, type PaginatedComments } from '../services/comments.service';
import { toast } from 'sonner';
import { ApiError } from '../api/client';
import { getErrorMessage, getSuccessMessage } from '../utils/error';
import { useTranslation } from '../i18n/LanguageContext';

export const commentsKeys = {
  all: ['comments'] as const,
  list: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    [...commentsKeys.all, 'list', params] as const,
};

export function useCommentsList(params?: { page?: number; limit?: number; status?: string; search?: string }) {
  return useQuery<PaginatedComments, ApiError>({
    queryKey: commentsKeys.list(params),
    queryFn: () => CommentsService.getAll(params),
  });
}

export function useApproveComment() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => CommentsService.approve(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: commentsKeys.all });
      
      const previousQueries = qc.getQueriesData<PaginatedComments>({ queryKey: ['comments', 'list'] });
      
      qc.setQueriesData<PaginatedComments>({ queryKey: ['comments', 'list'] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          comments: old.comments.map((c) =>
            c.id === id ? { ...c, status: 'approved' } : c
          ),
        };
      });

      return { previousQueries };
    },
    onError: (error: unknown, _id, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, oldData]) => {
          qc.setQueryData(queryKey, oldData);
        });
      }
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'comments'));
    },
    onSuccess: () => {
      toast.success(getSuccessMessage({ slug: 'STATUS_UPDATED' }, t as any, 'comments'));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: commentsKeys.all });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => CommentsService.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: commentsKeys.all });
      
      const previousQueries = qc.getQueriesData<PaginatedComments>({ queryKey: ['comments', 'list'] });
      
      qc.setQueriesData<PaginatedComments>({ queryKey: ['comments', 'list'] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          comments: old.comments.filter((c) => c.id !== id),
        };
      });

      return { previousQueries };
    },
    onError: (error: unknown, _id, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, oldData]) => {
          qc.setQueryData(queryKey, oldData);
        });
      }
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'comments'));
    },
    onSuccess: (_, id) => {
      toast.success(getSuccessMessage({ slug: 'COMMENT_DELETED' }, t as any, 'comments'));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: commentsKeys.all });
    },
  });
}

export function useReplyComment() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => CommentsService.reply(id, content),
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'comments'));
    },
    onSuccess: () => {
      toast.success(getSuccessMessage({ slug: 'COMMENT_REPLY_CREATED' }, t as any, 'comments'));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: commentsKeys.all });
    },
  });
}

export function useCommentsPage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterStatus]);

  const [actionCommentId, setActionCommentId] = useState<string | null>(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [viewComment, setViewComment] = useState<{ id: string; content: string; author: string } | null>(null);
  const [replyComment, setReplyComment] = useState<any | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplyOpen, setIsReplyOpen] = useState(false);

  const searchParams = useSearchParams();
  const highlightedId = searchParams.get("highlight") || searchParams.get("id");

  const { data, isLoading } = useCommentsList({ page, limit, status: filterStatus, search: debouncedSearch });
  const approveMutation = useApproveComment();
  const deleteMutation = useDeleteComment();
  const replyMutation = useReplyComment();

  useEffect(() => {
    if (highlightedId && data?.comments) {
      setTimeout(() => {
        const element = document.getElementById(`comment-${highlightedId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500);
    }
  }, [highlightedId, data]);

  const comments = data?.comments || [];
  const filteredComments = comments;

  const handleApproveConfirm = async () => {
    if (actionCommentId) {
      await approveMutation.mutateAsync(actionCommentId);
    }
    setIsApproveOpen(false);
    setActionCommentId(null);
  };

  const handleDeleteConfirm = async () => {
    if (actionCommentId) {
      await deleteMutation.mutateAsync(actionCommentId);
    }
    setIsDeleteOpen(false);
    setActionCommentId(null);
  };

  const handleReplyClick = (comment: any) => {
    setReplyComment(comment);
    setIsReplyOpen(true);
  };

  const handleReplyClose = () => {
    setIsReplyOpen(false);
    setReplyComment(null);
    setReplyText("");
  };

  const handleReplySubmit = async () => {
    if (replyComment && replyText.trim()) {
      const validation = replyCommentSchema.safeParse({ content: replyText });
      if (!validation.success) {
        const err = validation.error as any;
        const key = err.errors ? err.errors[0].message : err.issues[0].message;
        toast.error((t as any).comments?.errors?.[key] || key);
        return;
      }
      await replyMutation.mutateAsync({ id: replyComment.id, content: replyText });
      handleReplyClose();
    }
  };

  return {
    state: {
      viewMode,
      filterStatus,
      searchQuery,
      debouncedSearch,
      page,
      limit,
      actionCommentId,
      isApproveOpen,
      isDeleteOpen,
      viewComment,
      replyComment,
      replyText,
      isReplyOpen,
      highlightedId,
      isLoading,
      comments,
      filteredComments,
      data,
    },
    setters: {
      setViewMode,
      setFilterStatus,
      setSearchQuery,
      setPage,
      setActionCommentId,
      setIsApproveOpen,
      setIsDeleteOpen,
      setViewComment,
      setReplyText,
      setIsReplyOpen,
    },
    handlers: {
      handleApproveConfirm,
      handleDeleteConfirm,
      handleReplyClick,
      handleReplyClose,
      handleReplySubmit,
    },
    mutations: {
      replyMutation
    }
  };
}
