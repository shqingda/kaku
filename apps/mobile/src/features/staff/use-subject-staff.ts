import {
  type QueryClient,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import { router } from 'expo-router';

import { getSubjectStaff } from '@/infrastructure/bangumi/staff/provider';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

export function subjectStaffQueryOptions(subjectId: number) {
  return queryOptions({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ signal }) => getSubjectStaff(subjectId, signal),
    queryKey: queryKeys.subjectStaff(subjectId),
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 60 * 1000,
  });
}

export function useSubjectStaff(subjectId: number) {
  return useQuery(subjectStaffQueryOptions(subjectId));
}

export function prefetchSubjectStaff(
  queryClient: QueryClient,
  subjectId: number,
) {
  if (!Number.isInteger(subjectId) || subjectId <= 0) return;
  void queryClient.prefetchQuery(subjectStaffQueryOptions(subjectId));
  void router.prefetch({
    pathname: '/subject/[id]/staff',
    params: { id: String(subjectId) },
  });
}
