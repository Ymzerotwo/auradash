import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TeamService, type TeamMember, type TeamStats, type PaginatedTeam } from '../services/team.service';
import { toast } from 'sonner';
import { ApiError } from '../api/client';
import { getErrorMessage, getSuccessMessage } from '../utils/error';
import { useTranslation } from '../i18n/LanguageContext';
import { useState, useMemo, useCallback, useEffect } from 'react';

/* ─── Query Keys ──────────────────────────────────────────── */
export const teamKeys = {
  all: ['team'] as const,
  list: (params?: { search?: string; page?: number; limit?: number; status?: string }) =>
    [...teamKeys.all, 'list', params] as const,
  stats: () => [...teamKeys.all, 'stats'] as const,
  detail: (id: string) => [...teamKeys.all, 'detail', id] as const,
};

/* ─── Hooks ───────────────────────────────────────────────── */

/** Fetch paginated team list */
export function useTeamList(params?: { search?: string; page?: number; limit?: number; status?: string }) {
  return useQuery<PaginatedTeam, ApiError>({
    queryKey: teamKeys.list(params),
    queryFn: () => TeamService.getAll(params),
  });
}

/** Fetch team statistics */
export function useTeamStats() {
  return useQuery<TeamStats, ApiError>({
    queryKey: teamKeys.stats(),
    queryFn: () => TeamService.getStats(),
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: Partial<Omit<TeamMember, 'id' | 'created_at'>> & { password?: string }) =>
      TeamService.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: teamKeys.all });
      toast.success(getSuccessMessage({ slug: 'MEMBER_CREATED' }, t as any, 'users'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'users'));
    },
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<TeamMember, 'id' | 'created_at'>> & { password?: string } }) =>
      TeamService.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: teamKeys.all });
      toast.success(getSuccessMessage({ slug: 'MEMBER_UPDATED' }, t as any, 'users'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'users'));
    },
  });
}

/**
 * Toggle ban/active status — uses optimistic update so the UI
 * flips instantly without any loading indicator.
 */
export function useToggleMemberStatus() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { is_active?: boolean; is_banned?: boolean } }) =>
      TeamService.toggleStatus(id, data),

    onSuccess: (_res, variables) => {
      const { id, data } = variables;

      // Update every list cache on success
      qc.setQueriesData<PaginatedTeam>({ queryKey: ['team', 'list'] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          team: old.team.map((m) =>
            m.id === id
              ? { ...m, is_banned: data.is_banned ? 1 : 0 }
              : m
          ),
        };
      });

      // Update stats
      const previousStats = qc.getQueryData<TeamStats>(teamKeys.stats());
      if (previousStats) {
        const wasBanned = data.is_banned; // true = banning now
        qc.setQueryData<TeamStats>(teamKeys.stats(), {
          ...previousStats,
          activeMembers: previousStats.activeMembers + (wasBanned ? -1 : 1),
          suspendedMembers: previousStats.suspendedMembers + (wasBanned ? 1 : -1),
        });
      }

      toast.success(getSuccessMessage({ slug: 'MEMBER_UPDATED' }, t as any, 'users'));
    },

    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'users'));
    },

    onSettled: () => {
      // Always refetch from server to ensure consistency
      void qc.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

/** Delete a team member */
export function useDeleteMember() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: (id: string) => TeamService.delete(id),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: teamKeys.all });
      toast.success(getSuccessMessage({ slug: 'MEMBER_DELETED' }, t as any, 'users'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'users'));
    },
  });
}

// ─── PAGE HOOK ─────────────────────────────────────────────────────────────

export type ViewMode = "table" | "cards";

export function useTeamPageState() {
  const { t, locale } = useTranslation();
  const dict = t.users;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "banned">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamMember | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<TeamMember | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [detailUser, setDetailUser] = useState<TeamMember | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: teamData, error: teamError, isLoading: isTeamLoading } = useTeamList({ 
    limit: 20, 
    page: currentPage,
    search: searchQuery || undefined,
    status: statusFilter
  });
  const { data: statsData, isLoading: isStatsLoading } = useTeamStats();
  const toggleStatusMutation = useToggleMemberStatus();
  const deleteMutation = useDeleteMember();

  const isInitialLoading = isTeamLoading || isStatsLoading;

  const users = useMemo(() => teamData?.team ?? [], [teamData]);
  const totalPages = teamData?.pagination.totalPages || 1;
  const stats = useMemo(() => ({
    total: statsData?.totalMembers ?? 0,
    active: statsData?.activeMembers ?? 0,
    banned: statsData?.suspendedMembers ?? 0,
    admins: statsData?.adminsCount ?? 0,
  }), [statsData]);

  const isForbidden = (teamError as { slug?: string; code?: number })?.slug === 'FORBIDDEN'
    || (teamError as { code?: number })?.code === 403;

  const handleToggleStatus = useCallback((user: TeamMember) => {
    toggleStatusMutation.mutate({ id: user.id, data: { is_banned: user.is_banned === 0 } });
  }, [toggleStatusMutation]);

  const handleDelete = useCallback((user: TeamMember) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id, {
        onSuccess: () => {
          setIsDeleteModalOpen(false);
          setUserToDelete(null);
        }
      });
    }
  }, [deleteMutation, userToDelete]);

  const openAddDialog = useCallback(() => {
    setEditingUser(null);
    setIsFormOpen(true);
  }, []);

  const openEditDialog = useCallback((user: TeamMember) => {
    setEditingUser(user);
    setIsFormOpen(true);
  }, []);

  const openDetailDialog = useCallback((user: TeamMember) => {
    setDetailUser(user);
    setIsDetailOpen(true);
  }, []);

  const getInitials = useCallback((name: string) => {
    const parts = name.split(" ");
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    }).format(new Date(dateStr));
  }, [locale]);

  const filterTabs = useMemo(() => [
    { label: dict.search.filterAll, value: "all" as const },
    { label: dict.search.filterActive, value: "active" as const },
    { label: dict.search.filterBanned, value: "banned" as const },
  ], [dict.search]);

  return {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    viewMode, setViewMode,
    isFormOpen, setIsFormOpen,
    editingUser, setEditingUser,
    isDeleteModalOpen, setIsDeleteModalOpen,
    userToDelete, setUserToDelete,
    currentPage, setCurrentPage,
    detailUser, setDetailUser,
    isDetailOpen, setIsDetailOpen,
    isTeamLoading, isStatsLoading, isInitialLoading,
    users, totalPages, stats, isForbidden,
    handleToggleStatus, handleDelete, confirmDelete,
    openAddDialog, openEditDialog, openDetailDialog,
    toggleStatusMutation,
    deleteMutation,
    getInitials, formatDate, filterTabs
  };
}
