import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import { getFriendTimeline } from '@/infrastructure/kaku/timeline-client';
import { queryKeys } from '@/lib/query-keys';

export function useFriendTimeline() {
  const { request, session } = useAuth();

  return useQuery({
    enabled: Boolean(session),
    queryFn: () => getFriendTimeline(request),
    queryKey: queryKeys.friendTimeline(session?.user.id),
    retry: 1,
    staleTime: 60 * 1000,
  });
}
