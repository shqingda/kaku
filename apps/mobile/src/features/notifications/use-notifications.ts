import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import { getNotifications } from '@/infrastructure/kaku/notifications-client';
import { queryKeys } from '@/lib/query-keys';

export function useNotifications() {
  const { request, session } = useAuth();

  return useQuery({
    enabled: Boolean(session),
    queryFn: () => getNotifications(request),
    queryKey: queryKeys.notifications(session?.user.id),
    retry: 1,
    staleTime: 30 * 1000,
  });
}
