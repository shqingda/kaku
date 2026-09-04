import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import {
  getPersonalCollection,
  savePersonalCollection,
} from '@/infrastructure/kaku/collections-client';
import { queryKeys } from '@/lib/query-keys';
import { bangumiRetryDelay, shouldRetryBangumiQuery } from '@/lib/query-retry';
import {
  mergePersonalCollection,
  type PersonalCollection,
  type PersonalCollectionUpdate,
} from './model';

export function usePersonalCollection(subjectId: number) {
  const { request, session } = useAuth();

  return useQuery({
    enabled: Boolean(session) && Number.isInteger(subjectId) && subjectId > 0,
    queryFn: ({ signal }) =>
      getPersonalCollection(request, subjectId, signal),
    queryKey: queryKeys.personalCollection(session?.user.id, subjectId),
    meta: { private: true },
    refetchOnWindowFocus: 'always',
    retry: shouldRetryBangumiQuery,
    staleTime: 60 * 1000,
    retryDelay: bangumiRetryDelay,
  });
}

export function useSavePersonalCollection(subjectId: number) {
  const { request, session } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.personalCollection(session?.user.id, subjectId);

  return useMutation<
    PersonalCollection | null,
    Error,
    PersonalCollectionUpdate,
    { previous: PersonalCollection | null | undefined }
  >({
    mutationFn: (update: PersonalCollectionUpdate) =>
      savePersonalCollection(request, subjectId, update),
    onError: (_error, _update, context) => {
      if (context) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      void queryClient.invalidateQueries({ queryKey });
    },
    onMutate: async (update) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PersonalCollection | null>(
        queryKey,
      );
      queryClient.setQueryData<PersonalCollection | null>(
        queryKey,
        mergePersonalCollection(previous, update, subjectId),
      );
      return { previous };
    },
    onSuccess: (collection) => {
      queryClient.setQueryData(queryKey, collection);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.publicUser(session?.user.username ?? ''),
      });
    },
  });
}
