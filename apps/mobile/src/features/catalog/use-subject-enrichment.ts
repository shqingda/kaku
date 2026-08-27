import { useQuery } from '@tanstack/react-query';

import { getSubjectEnrichment } from '@/infrastructure/kaku/enrichment-client';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

export function useSubjectEnrichment(subjectId: number, enabled: boolean) {
  return useQuery({
    enabled: enabled && subjectId > 0,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ signal }) => getSubjectEnrichment(subjectId, signal),
    queryKey: queryKeys.subjectEnrichment(subjectId),
    retry: shouldRetryBangumiQuery,
    staleTime: 6 * 60 * 60 * 1000,
  });
}
