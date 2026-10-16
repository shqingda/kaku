import {
  type InfiniteData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { AuthSessionChangedError, useAuth, useAuthActions, type AuthRequestScope } from '@/features/auth/auth-provider';
import {
  getPersonalCollection,
  savePersonalCollection,
} from '@/infrastructure/kaku/collections-client';
import { queryKeys } from '@/lib/query-keys';
import { PRIVATE_QUERY_META } from '@/lib/query-persistence';
import { bangumiRetryDelay, shouldRetryBangumiQuery } from '@/lib/query-retry';
import type { PublicUserCollectionPage } from '@/features/users/model';
import { listItemFromPersonalCollection } from './collection-search';
import {
  mergePersonalCollection,
  type PersonalCollection,
  type PersonalCollectionUpdate,
} from './model';

export function usePersonalCollection(
  subjectId: number,
  options?: { enabled?: boolean },
) {
  const { request, session } = useAuth();

  return useQuery({
    enabled:
      (options?.enabled ?? true) &&
      Boolean(session) &&
      Number.isInteger(subjectId) &&
      subjectId > 0,
    queryFn: ({ signal }) =>
      getPersonalCollection(request, subjectId, signal),
    queryKey: queryKeys.personalCollection(session?.user.id, subjectId),
    meta: PRIVATE_QUERY_META,
    refetchOnWindowFocus: 'always',
    retry: shouldRetryBangumiQuery,
    staleTime: 60 * 1000,
    retryDelay: bangumiRetryDelay,
  });
}

export function useSavePersonalCollection(subjectId: number) {
  const { session } = useAuth();
  const { captureRequest } = useAuthActions();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.personalCollection(session?.user.id, subjectId);

  type Variables = { update: PersonalCollectionUpdate; scope: AuthRequestScope; subjectId: number; username: string };
  const mutation = useMutation<
    PersonalCollection | null,
    Error,
    Variables,
    { previous: PersonalCollection | null | undefined }
  >({
    scope: { id: JSON.stringify(queryKey) },
    retry: false,
    mutationFn: async ({ update, scope, subjectId }) => {
      if (!scope.isCurrent()) throw new AuthSessionChangedError();
      const collection = await savePersonalCollection(scope.request, subjectId, update);
      if (!scope.isCurrent()) throw new AuthSessionChangedError();
      return collection;
    },
    onError: (_error, { scope, subjectId }, context) => {
      if (!scope.isCurrent()) return;
      const queryKey = queryKeys.personalCollection(scope.identity.userId, subjectId);
      if (context) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      void queryClient.invalidateQueries({ queryKey });
    },
    onMutate: async ({ update, scope, subjectId }) => {
      if (!scope.isCurrent()) throw new AuthSessionChangedError();
      const queryKey = queryKeys.personalCollection(scope.identity.userId, subjectId);
      await queryClient.cancelQueries({ queryKey });
      if (!scope.isCurrent()) throw new AuthSessionChangedError();
      const previous = queryClient.getQueryData<PersonalCollection | null>(
        queryKey,
      );
      queryClient.setQueryData<PersonalCollection | null>(
        queryKey,
        mergePersonalCollection(previous, update, subjectId),
      );
      return { previous };
    },
    onSuccess: (collection, { scope, subjectId, username }) => {
      if (!scope.isCurrent()) return;
      const queryKey = queryKeys.personalCollection(scope.identity.userId, subjectId);
      queryClient.setQueryData(queryKey, collection);
      if (collection) {
        queryClient.setQueryData<InfiniteData<PublicUserCollectionPage>>(
          queryKeys.myCollectionSearch(scope.identity.userId),
          (data) => {
            if (!data) return data;
            const updatedAt = new Date().toISOString();
            return {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                  item.id === subjectId
                    ? listItemFromPersonalCollection(item, collection, updatedAt)
                    : item,
                ),
              })),
            };
          },
        );
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.myCollections(scope.identity.userId),
        predicate: (query) => query.queryKey[3] === 'browse',
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.publicUser(username),
      });
    },
  });
  return {
    ...mutation,
    mutate: (update: PersonalCollectionUpdate) => mutation.mutate({ update, scope: captureRequest(), subjectId, username: session?.user.username ?? '' }),
    mutateAsync: async (update: PersonalCollectionUpdate) => {
      const scope = captureRequest();
      const collection = await mutation.mutateAsync({ update, scope, subjectId, username: session?.user.username ?? '' });
      if (!scope.isCurrent()) throw new AuthSessionChangedError();
      return collection;
    },
  };
}
