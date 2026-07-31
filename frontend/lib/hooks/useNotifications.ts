import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NotificationsService } from '../services/notifications.service';
import { useStateStore } from '../stores/state.store';

export const notificationsKeys = {
  all: ['notifications'] as const,
  infinite: () => [...notificationsKeys.all, 'infinite'] as const,
};

export function useNotificationsInfinite() {
  return useInfiniteQuery({
    queryKey: notificationsKeys.infinite(),
    queryFn: ({ pageParam = 1 }) => NotificationsService.getNotifications({ page: pageParam, limit: 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
  });
}

export function useMarkNotificationAsRead() {
  const qc = useQueryClient();
  const setCounters = useStateStore((s) => s.setCounters);

  return useMutation({
    mutationFn: (id: string) => NotificationsService.markAsRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notificationsKeys.infinite() });

      // Optimistic update
      qc.setQueryData(notificationsKeys.infinite(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            notifications: page.notifications.map((n: any) =>
              n.id === id ? { ...n, is_read: 1 } : n
            ),
          })),
        };
      });

      // Optimistically decrement unread counter
      const currentCounters = useStateStore.getState().counters;
      setCounters({
        notifications: Math.max(0, currentCounters.notifications - 1),
      });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: notificationsKeys.all });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const qc = useQueryClient();
  const setCounters = useStateStore((s) => s.setCounters);

  return useMutation({
    mutationFn: () => NotificationsService.markAllAsRead(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: notificationsKeys.infinite() });

      // Optimistic update
      qc.setQueryData(notificationsKeys.infinite(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            notifications: page.notifications.map((n: any) => ({ ...n, is_read: 1 })),
          })),
        };
      });

      // Clear counter
      setCounters({ notifications: 0 });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: notificationsKeys.all });
    },
  });
}
