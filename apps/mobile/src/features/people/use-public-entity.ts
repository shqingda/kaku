import {
  type QueryClient,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';

import {
  getCharacter,
  getEntityComments,
  getPerson,
} from '@/infrastructure/bangumi/people/provider';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

export function characterQueryOptions(characterId: number) {
  return queryOptions({
    enabled: Number.isInteger(characterId) && characterId > 0,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ signal }) => getCharacter(characterId, signal),
    queryKey: queryKeys.character(characterId),
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 60 * 1000,
  });
}

export function personQueryOptions(personId: number) {
  return queryOptions({
    enabled: Number.isInteger(personId) && personId > 0,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ signal }) => getPerson(personId, signal),
    queryKey: queryKeys.person(personId),
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 60 * 1000,
  });
}

export function useCharacter(characterId: number) {
  return useQuery(characterQueryOptions(characterId));
}

export function usePerson(personId: number) {
  return useQuery(personQueryOptions(personId));
}

export function prefetchCharacter(queryClient: QueryClient, characterId: number) {
  if (!Number.isInteger(characterId) || characterId <= 0) return;
  void queryClient.prefetchQuery(characterQueryOptions(characterId));
}

export function prefetchPerson(queryClient: QueryClient, personId: number) {
  if (!Number.isInteger(personId) || personId <= 0) return;
  void queryClient.prefetchQuery(personQueryOptions(personId));
}

export function useEntityComments(
  kind: 'character' | 'person',
  entityId: number,
) {
  return useQuery({
    enabled: Number.isInteger(entityId) && entityId > 0,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ signal }) =>
      getEntityComments(kind, entityId, signal),
    queryKey: queryKeys.entityComments(kind, entityId),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}
