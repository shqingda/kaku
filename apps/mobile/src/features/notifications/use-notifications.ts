import { AuthSessionChangedError } from '@/features/auth/auth-request-scope';
import { useAuthMutation } from '@/features/auth/use-auth-mutation';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import {
  getNotifications,
  markNotificationsRead,
} from '@/infrastructure/kaku/notifications-client';
import { queryKeys } from '@/lib/query-keys';
import { PRIVATE_QUERY_META } from '@/lib/query-persistence';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';
import type { NotificationList } from './model';

export function useNotifications() {
  const { request, session } = useAuth();

  return useQuery({
    enabled: Boolean(session),
    queryFn: ({ signal }) => getNotifications(request, signal),
    queryKey: queryKeys.notifications(session?.user.id),
    meta: PRIVATE_QUERY_META,
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 1000,
  });
}

export function useMarkNotificationsRead() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.notifications(session?.user.id);

  return useAuthMutation<
    void,
    Error,
    number[] | undefined,
    { previous: NotificationList | undefined }
  >({
    mutationFn: (ids, request) => markNotificationsRead(request, ids),
    onError: (_error, _ids, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onMutate: async (ids, scope) => {
      await queryClient.cancelQueries({ queryKey });
      if (!scope.isCurrent()) throw new AuthSessionChangedError();
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
