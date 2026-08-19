import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import type { PublicUserEntityCollectionPage } from '@/features/users/model';
import {
  getEntityCollection,
  saveEntityCollection,
  type EntityCollectionKind,
} from '@/infrastructure/kaku/entity-collections-client';
import { queryKeys } from '@/lib/query-keys';
import { bangumiRetryDelay, shouldRetryBangumiQuery } from '@/lib/query-retry';

export function useEntityCollection(
  kind: EntityCollectionKind,
  entityId: number,
) {
  const { request, session } = useAuth();

  return useQuery({
    enabled: Boolean(session) && Number.isInteger(entityId) && entityId > 0,
    queryFn: ({ signal }) =>
      getEntityCollection(request, kind, entityId, signal),
    queryKey: queryKeys.entityCollection(session?.user.id, kind, entityId),
    meta: { private: true },
    retry: shouldRetryBangumiQuery,
    staleTime: 60 * 1000,
    retryDelay: bangumiRetryDelay,
  });
}

export function useSaveEntityCollection(
  kind: EntityCollectionKind,
  entityId: number,
) {
  const { request, session } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.entityCollection(
    session?.user.id,
    kind,
    entityId,
  );

  return useMutation<boolean, Error, boolean, { previous?: boolean }>({
    mutationFn: (collected) =>
      saveEntityCollection(request, kind, entityId, collected),
    onError: (_error, _collected, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onMutate: async (collected) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<boolean>(queryKey);
      queryClient.setQueryData(queryKey, collected);
      return { previous };
    },
    onSuccess: (collected) => {
      queryClient.setQueryData(queryKey, collected);
      void queryClient.invalidateQueries({
        queryKey:
          kind === 'character'
            ? queryKeys.character(entityId)
            : queryKeys.person(entityId),
      });
      if (session) {
        const collectionListKey = queryKeys.publicUserEntities(
          session.user.username,
          kind,
        );
        if (!collected) {
          queryClient.setQueryData<PublicUserEntityCollectionPage>(
            collectionListKey,
            (current) =>
              current
                ? {
                    ...current,
                    items: current.items.filter((item) => item.id !== entityId),
                    total: Math.max(0, current.total - 1),
                  }
                : current,
          );
        }
        if (collected) {
          void queryClient.invalidateQueries({ queryKey: collectionListKey });
        }
      }
    },
  });
}
