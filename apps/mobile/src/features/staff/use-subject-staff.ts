import { useQuery } from '@tanstack/react-query';

import { bangumiStaffProvider } from '@/infrastructure/bangumi/staff/provider';
import { queryKeys } from '@/lib/query-keys';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

export function useSubjectStaff(subjectId: number) {
  return useQuery({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    queryFn: () => bangumiStaffProvider.getSubjectStaff(subjectId),
    queryKey: queryKeys.subjectStaff(subjectId),
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 60 * 1000,
  });
}
