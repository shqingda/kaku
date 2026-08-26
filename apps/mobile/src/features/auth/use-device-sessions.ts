import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

import {
  parseDeviceSessions,
  readErrorMessage,
} from '@/infrastructure/kaku/auth-client';
import { useAuth } from './auth-provider';
import type { DeviceSession } from './model';

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

async function revokeOtherDeviceSessions(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  sessions: DeviceSession[],
) {
  const bulk = await request('/auth/sessions', { method: 'DELETE' });

  if (bulk.ok) {
    return bulk.json() as Promise<{ revoked: number }>;
  }

  // 线上若尚未部署 DELETE /auth/sessions，退回到已有的按设备退出。
  if (bulk.status !== 404) {
    throw new Error(await readErrorMessage(bulk));
  }

  const others = sessions.filter((deviceSession) => !deviceSession.current);
  for (const deviceSession of others) {
    const response = await request(
      `/auth/sessions/${encodeURIComponent(deviceSession.sessionId)}`,
      { method: 'DELETE' },
    );

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }
  }

  return { revoked: others.length };
}

export function useRevokeOtherDeviceSessions() {
  const { request, session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () =>
      revokeOtherDeviceSessions(
        request,
        queryClient.getQueryData<DeviceSession[]>(
          deviceSessionsKey(session?.user.id),
        ) ?? [],
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: deviceSessionsKey(session?.user.id),
      }),
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
