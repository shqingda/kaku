import {
  type QueryClient,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import { router } from 'expo-router';

import {
  getSubjectCharacters,
  getSubjectRelations,
} from '@/infrastructure/bangumi/subject-extras/provider';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

export function subjectCharactersQueryOptions(subjectId: number) {
  return queryOptions({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ signal }) => getSubjectCharacters(subjectId, signal),
    queryKey: queryKeys.subjectCharacters(subjectId),
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 60 * 1000,
  });
}

export function subjectRelationsQueryOptions(subjectId: number) {
  return queryOptions({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ signal }) => getSubjectRelations(subjectId, signal),
    queryKey: queryKeys.subjectRelations(subjectId),
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 60 * 1000,
  });
}

export function useSubjectCharacters(subjectId: number) {
  return useQuery(subjectCharactersQueryOptions(subjectId));
}

export function useSubjectRelations(subjectId: number) {
  return useQuery(subjectRelationsQueryOptions(subjectId));
}

export function prefetchSubjectCharacters(
  queryClient: QueryClient,
  subjectId: number,
) {
  if (!Number.isInteger(subjectId) || subjectId <= 0) return;
  void queryClient.prefetchQuery(subjectCharactersQueryOptions(subjectId));
  void router.prefetch({
    pathname: '/subject/[id]/characters',
    params: { id: String(subjectId) },
  });
}

export function prefetchSubjectRelations(
  queryClient: QueryClient,
  subjectId: number,
) {
  if (!Number.isInteger(subjectId) || subjectId <= 0) return;
  void queryClient.prefetchQuery(subjectRelationsQueryOptions(subjectId));
  void router.prefetch({
    pathname: '/subject/[id]/relations',
    params: { id: String(subjectId) },
  });
}
