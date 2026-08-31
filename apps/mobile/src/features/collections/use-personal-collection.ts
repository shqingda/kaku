import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import {
  getPersonalCollection,
  savePersonalCollection,
} from '@/infrastructure/kaku/collections-client';
import { queryKeys } from '@/lib/query-keys';
import { bangumiRetryDelay, shouldRetryBangumiQuery } from '@/lib/query-retry';
import type {
  PersonalCollection,
  PersonalCollectionUpdate,
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
      const nextStatus =
        update.collectionStatus ?? previous?.collectionStatus ?? null;
      queryClient.setQueryData<PersonalCollection | null>(
        queryKey,
        nextStatus
          ? {
              collectionStatus: nextStatus,
              comment: update.comment ?? previous?.comment ?? '',
              isPrivate: update.isPrivate ?? previous?.isPrivate ?? false,
              readChapterCount:
                update.readChapterCount ?? previous?.readChapterCount,
              readVolumeCount:
                update.readVolumeCount ?? previous?.readVolumeCount,
              rating: update.rating ?? previous?.rating,
              subjectId,
              tags: update.tags ?? previous?.tags ?? [],
              watchedEpisodeNumbers: update.watchedEpisodeNumbers ?? [],
            }
          : null,
      );
      return { previous };
    },
    onSuccess: (collection) => {
      queryClient.setQueryData(queryKey, collection);
      void queryClient.invalidateQueries({
        queryKey: ['users', 'bangumi', session?.user.username],
      });
    },
  });
}
