import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bangumiRetryDelay, shouldRetryBangumiQuery } from '@/lib/query-retry';

import {
  parseDeviceSessions,
  readErrorMessage,
} from '@/infrastructure/kaku/auth-client';
import { useAuth } from './auth-provider';

const deviceSessionsKey = (userId?: number) =>
  ['auth', 'kaku', 'sessions', userId ?? 'signed-out'] as const;

export function useDeviceSessions() {
  const { request, session } = useAuth();

  return useQuery({
    enabled: Boolean(session),
    queryFn: async ({ signal }) => {
      const response = await request('/auth/sessions', { signal });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      return parseDeviceSessions(response);
    },
    queryKey: deviceSessionsKey(session?.user.id),
    meta: { private: true },
    retry: shouldRetryBangumiQuery,
  });
}

export function useRevokeDeviceSession() {
  const { request, session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await request(
        `/auth/sessions/${encodeURIComponent(sessionId)}`,
        { method: 'DELETE' },
      );

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: deviceSessionsKey(session?.user.id),
      }),
  });
}
