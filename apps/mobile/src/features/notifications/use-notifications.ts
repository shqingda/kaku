import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import {
  getNotifications,
  markNotificationsRead,
} from '@/infrastructure/kaku/notifications-client';
import { queryKeys } from '@/lib/query-keys';
import { bangumiRetryDelay, shouldRetryBangumiQuery } from '@/lib/query-retry';
import type { NotificationList } from './model';

export function useNotifications() {
  const { request, session } = useAuth();

  return useQuery({
    enabled: Boolean(session),
    queryFn: ({ signal }) => getNotifications(request, signal),
    queryKey: queryKeys.notifications(session?.user.id),
    meta: { private: true },
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 1000,
  });
}

export function useMarkNotificationsRead() {
  const { request, session } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.notifications(session?.user.id);

  return useMutation<
    void,
    Error,
    number[] | undefined,
    { previous: NotificationList | undefined }
  >({
    mutationFn: (ids) => markNotificationsRead(request, ids),
    onError: (_error, _ids, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NotificationList>(queryKey);
      const selected = ids ? new Set(ids) : null;

      if (previous) {
        const items = previous.items.map((item) =>
          !selected || selected.has(item.id) ? { ...item, unread: false } : item,
        );
        queryClient.setQueryData<NotificationList>(queryKey, {
          ...previous,
          items,
          unreadCount: items.filter((item) => item.unread).length,
        });
      }

      return { previous };
    },
  });
}
