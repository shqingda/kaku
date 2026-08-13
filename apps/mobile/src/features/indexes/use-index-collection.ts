import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import {
  getIndexCollection,
  setIndexCollection,
} from '@/infrastructure/kaku/indexes-client';
import { queryKeys } from '@/lib/query-keys';

export function useIndexCollection(indexId: number) {
  const { request, session } = useAuth();

  return useQuery({
    enabled: Boolean(session) && indexId > 0,
    queryFn: ({ signal }) => getIndexCollection(request, indexId, signal),
    meta: { private: true },
    queryKey: queryKeys.indexCollection(session?.user.id, indexId),
    retry: false,
    staleTime: 60 * 1000,
  });
}

export function useSetIndexCollection(indexId: number) {
  const { request, session } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.indexCollection(session?.user.id, indexId);

  return useMutation<boolean, Error, boolean, { previous: boolean | undefined }>({
    mutationFn: (shouldCollect: boolean) =>
      setIndexCollection(request, indexId, shouldCollect),
    onError: (_error, _shouldCollect, context) => {
      if (context) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onMutate: async (shouldCollect) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<boolean>(queryKey);
      queryClient.setQueryData(queryKey, shouldCollect);
      return { previous };
    },
    onSuccess: (collected) => {
      queryClient.setQueryData(queryKey, collected);
      // 收藏数会变化，刷新目录详情。
      void queryClient.invalidateQueries({
        queryKey: queryKeys.publicIndex(indexId),
      });
    },
  });
}
