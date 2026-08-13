import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import {
  getUserFriendship,
  setUserFriend,
} from '@/infrastructure/kaku/friends-client';
import { queryKeys } from '@/lib/query-keys';

export function useUserFriendship(username: string) {
  const { request, session } = useAuth();

  return useQuery({
    enabled: Boolean(session) && username.trim().length > 0,
    queryFn: ({ signal }) =>
      getUserFriendship(request, username.trim(), signal),
    meta: { private: true },
    queryKey: queryKeys.userFriendship(session?.user.id, username.trim()),
    retry: false,
    staleTime: 60 * 1000,
  });
}

export function useSetUserFriend(username: string) {
  const { request, session } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.userFriendship(session?.user.id, username.trim());

  return useMutation<
    boolean,
    Error,
    boolean,
    { previous: boolean | undefined }
  >({
    mutationFn: (shouldAdd: boolean) =>
      setUserFriend(request, username.trim(), shouldAdd),
    onError: (_error, _shouldAdd, context) => {
      if (context) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onMutate: async (shouldAdd) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<boolean>(queryKey);
      queryClient.setQueryData(queryKey, shouldAdd);
      return { previous };
    },
    onSuccess: (isFriend) => {
      queryClient.setQueryData(queryKey, isFriend);
      // 好友关系变化会影响公开好友列表与时间线内容。
      void queryClient.invalidateQueries({
        queryKey: ['users', 'bangumi', username.trim()],
      });
    },
  });
}
