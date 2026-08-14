import { useQuery } from '@tanstack/react-query';

import { bangumiCatalogProvider } from '@/infrastructure/bangumi/catalog/provider';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

const CATALOG_QUERY_VERSION = 4;

export function useCatalogSubject(subjectId: number) {
  return useQuery({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ signal }) =>
      bangumiCatalogProvider.getSubject(subjectId, signal),
    queryKey: queryKeys.catalogSubject(subjectId, CATALOG_QUERY_VERSION),
    retry: shouldRetryBangumiQuery,
    staleTime: 5 * 60 * 1000,
  });
}
