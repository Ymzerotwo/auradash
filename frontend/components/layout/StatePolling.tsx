'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useStateStore } from '@/lib/stores/state.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { notificationsKeys } from '@/lib/hooks/useNotifications';

export function StatePolling() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user, hydrated } = useAuthStore();
  
  const setVersions = useStateStore((s) => s.setVersions);
  const setCounters = useStateStore((s) => s.setCounters);
  
  const stateRef = useRef({
    pathname,
    user,
    hydrated,
    versions: useStateStore.getState().versions
  });

  useEffect(() => {
    stateRef.current.pathname = pathname;
    stateRef.current.user = user;
    stateRef.current.hydrated = hydrated;
  }, [pathname, user, hydrated]);

  useEffect(() => {
    return useStateStore.subscribe((state) => {
      stateRef.current.versions = state.versions;
    });
  }, []);

  useEffect(() => {
    let isPolling = true;

    const pollHash = async () => {
      if (!isPolling) return;
      
      try {
        const { hydrated: isHydrated, user: currentUser, pathname: currentPath, versions: currentVersions } = stateRef.current;
        
        if (isHydrated && currentUser && !currentPath.startsWith('/login') && !currentPath.startsWith('/banned')) {
          if (typeof document === 'undefined' || document.visibilityState === 'visible') {
            const newStateRes = await apiClient.get<any>('/state/hash');
            const newState = newStateRes?.data ?? newStateRes;
            
            if (newState && typeof newState === 'object') {
              let hasChanges = false;
              if (
                newState.notifications_version !== currentVersions.notifications_version ||
                newState.inbox_version !== currentVersions.inbox_version ||
                newState.comments_version !== currentVersions.comments_version ||
                newState.bookings_version !== currentVersions.bookings_version
              ) {
                hasChanges = true;
                
                if (newState.notifications_version !== currentVersions.notifications_version) {
                  queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
                }

                setVersions({
                  notifications_version: newState.notifications_version,
                  inbox_version: newState.inbox_version,
                  comments_version: newState.comments_version,
                  bookings_version: newState.bookings_version,
                });
              }

              if (hasChanges || !currentVersions.notifications_version) {
                const countersRes = await apiClient.get<any>('/state/counters');
                const countersData = countersRes?.data ?? countersRes;
                if (countersData && typeof countersData === 'object') {
                  setCounters({
                    notifications: countersData.notifications || 0,
                    inbox: countersData.inbox || 0,
                    comments: countersData.comments || 0,
                    bookings: countersData.bookings || 0,
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('[StatePolling] Error fetching state:', error);
      } finally {
        if (isPolling) {
          setTimeout(pollHash, 15000);
        }
      }
    };

    pollHash();

    return () => {
      isPolling = false;
    };
  }, [setVersions, setCounters, queryClient]);

  return null;
}
