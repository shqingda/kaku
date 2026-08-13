import { useQuery } from '@tanstack/react-query';

import { bangumiPeopleProvider } from '@/infrastructure/bangumi/people/provider';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

export function useCharacter(characterId: number) {
  return useQuery({
    enabled: Number.isInteger(characterId) && characterId > 0,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ signal }) =>
      bangumiPeopleProvider.getCharacter(characterId, signal),
    queryKey: queryKeys.character(characterId),
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 60 * 1000,
  });
}

export function usePerson(personId: number) {
  return useQuery({
    enabled: Number.isInteger(personId) && personId > 0,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ signal }) => bangumiPeopleProvider.getPerson(personId, signal),
    queryKey: queryKeys.person(personId),
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 60 * 1000,
  });
}

export function useEntityComments(
  kind: 'character' | 'person',
  entityId: number,
) {
  return useQuery({
    enabled: Number.isInteger(entityId) && entityId > 0,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ signal }) =>
      bangumiPeopleProvider.getComments(kind, entityId, signal),
    queryKey: queryKeys.entityComments(kind, entityId),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}
