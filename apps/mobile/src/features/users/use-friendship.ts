import { AuthSessionChangedError } from '@/features/auth/auth-request-scope';
import { useAuthMutation } from '@/features/auth/use-auth-mutation';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import {
  getUserFriendship,
  setUserFriend,
} from '@/infrastructure/kaku/friends-client';
import { queryKeys } from '@/lib/query-keys';
import { PRIVATE_QUERY_META } from '@/lib/query-persistence';
import { bangumiRetryDelay, shouldRetryBangumiQuery } from '@/lib/query-retry';

export function useUserFriendship(username: string) {
  const { request, session } = useAuth();

  return useQuery({
    enabled: Boolean(session) && username.trim().length > 0,
    queryFn: ({ signal }) =>
      getUserFriendship(request, username.trim(), signal),
    meta: PRIVATE_QUERY_META,
    queryKey: queryKeys.userFriendship(session?.user.id, username.trim()),
    retry: shouldRetryBangumiQuery,
    staleTime: 60 * 1000,
    retryDelay: bangumiRetryDelay,
  });
}

export function useSetUserFriend(username: string) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.userFriendship(session?.user.id, username.trim());

  return useAuthMutation<
    boolean,
    Error,
    boolean,
    { previous: boolean | undefined }
  >({
    mutationFn: (shouldAdd: boolean, request) =>
      setUserFriend(request, username.trim(), shouldAdd),
    onError: (_error, _shouldAdd, context) => {
      if (context) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onMutate: async (shouldAdd, scope) => {
      await queryClient.cancelQueries({ queryKey });
      if (!scope.isCurrent()) throw new AuthSessionChangedError();
      const previous = queryClient.getQueryData<boolean>(queryKey);
      queryClient.setQueryData(queryKey, shouldAdd);
      return { previous };
    },
    onSuccess: (isFriend) => {
      queryClient.setQueryData(queryKey, isFriend);
      // 好友关系变化会影响公开好友列表与时间线内容。
      void queryClient.invalidateQueries({
        queryKey: queryKeys.publicUser(username),
      });
    },
  });
}
