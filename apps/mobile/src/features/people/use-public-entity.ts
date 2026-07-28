import { useQuery } from '@tanstack/react-query';

import { bangumiPeopleProvider } from '@/infrastructure/bangumi/people/provider';
import { queryKeys } from '@/lib/query-keys';

export function useCharacter(characterId: number) {
  return useQuery({
    enabled: Number.isInteger(characterId) && characterId > 0,
    queryFn: () => bangumiPeopleProvider.getCharacter(characterId),
    queryKey: queryKeys.character(characterId),
    retry: 2,
    staleTime: 30 * 60 * 1000,
  });
}

export function usePerson(personId: number) {
  return useQuery({
    enabled: Number.isInteger(personId) && personId > 0,
    queryFn: () => bangumiPeopleProvider.getPerson(personId),
    queryKey: queryKeys.person(personId),
    retry: 2,
    staleTime: 30 * 60 * 1000,
  });
}
