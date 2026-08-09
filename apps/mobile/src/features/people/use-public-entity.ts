import { useQuery } from '@tanstack/react-query';

import { bangumiPeopleProvider } from '@/infrastructure/bangumi/people/provider';
import { queryKeys } from '@/lib/query-keys';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

export function useCharacter(characterId: number) {
  return useQuery({
    enabled: Number.isInteger(characterId) && characterId > 0,
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
    queryFn: ({ signal }) => bangumiPeopleProvider.getPerson(personId, signal),
    queryKey: queryKeys.person(personId),
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 60 * 1000,
  });
}
