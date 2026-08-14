import { useQuery } from '@tanstack/react-query';

import { getChannelSubjects } from '@/infrastructure/kaku/channels-client';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

export function useChannel(subjectType: number) {
  return useQuery({
    meta: PUBLIC_QUERY_META,
    queryFn: ({ signal }) => getChannelSubjects(subjectType, signal),
    queryKey: queryKeys.channel(subjectType),
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 60 * 1000,
  });
}
