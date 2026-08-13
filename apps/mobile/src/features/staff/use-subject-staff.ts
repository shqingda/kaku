import { useQuery } from '@tanstack/react-query';

import { bangumiStaffProvider } from '@/infrastructure/bangumi/staff/provider';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

export function useSubjectStaff(subjectId: number) {
  return useQuery({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ signal }) =>
      bangumiStaffProvider.getSubjectStaff(subjectId, signal),
    queryKey: queryKeys.subjectStaff(subjectId),
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 60 * 1000,
  });
}
