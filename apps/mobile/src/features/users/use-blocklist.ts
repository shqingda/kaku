import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import {
  getBlocklist,
  setUserBlocked,
} from '@/infrastructure/kaku/friends-client';
import { queryKeys } from '@/lib/query-keys';

// 屏蔽列表是被屏蔽用户的 ID 数组，与公开资料的 user.id 比对得到状态。
export function useBlocklist() {
  const { request, session } = useAuth();

  return useQuery({
    enabled: Boolean(session),
    queryFn: ({ signal }) => getBlocklist(request, signal),
    meta: { private: true },
    queryKey: queryKeys.blocklist(session?.user.id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSetUserBlocked(username: string) {
  const { request, session } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.blocklist(session?.user.id);

  return useMutation<number[], Error, boolean>({
    mutationFn: (shouldBlock: boolean) =>
      setUserBlocked(request, username.trim(), shouldBlock),
    onSuccess: (blocklist) => {
      queryClient.setQueryData(queryKey, blocklist);
    },
  });
}
