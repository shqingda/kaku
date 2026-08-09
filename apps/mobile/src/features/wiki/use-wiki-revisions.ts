import { useQuery } from '@tanstack/react-query';

import { getWikiRevisionFeed } from '@/infrastructure/kaku/wiki-client';
import { queryKeys } from '@/lib/query-keys';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

export function useWikiRevisions() {
  return useQuery({
    queryFn: ({ signal }) => getWikiRevisionFeed(signal),
    queryKey: queryKeys.wikiRevisions(),
    retry: shouldRetryBangumiQuery,
    staleTime: 2 * 60 * 1000,
  });
}
