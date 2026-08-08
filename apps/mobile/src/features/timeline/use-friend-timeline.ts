import {
  type InfiniteData,
  useInfiniteQuery,
} from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import { getFriendTimeline } from '@/infrastructure/kaku/timeline-client';
import { queryKeys } from '@/lib/query-keys';
import type { FriendTimelinePage } from './model';

export function useFriendTimeline() {
  const { request, session } = useAuth();

  return useInfiniteQuery<
    FriendTimelinePage,
    Error,
    InfiniteData<FriendTimelinePage>,
    ReturnType<typeof queryKeys.friendTimeline>,
    number | undefined
  >({
    enabled: Boolean(session),
    getNextPageParam: (lastPage) => lastPage.nextUntil,
    initialPageParam: undefined,
    queryFn: ({ pageParam }) => getFriendTimeline(request, pageParam),
    queryKey: queryKeys.friendTimeline(session?.user.id),
    retry: 1,
    staleTime: 60 * 1000,
  });
}
