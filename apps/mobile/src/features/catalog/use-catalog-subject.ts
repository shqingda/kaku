import { useQuery } from '@tanstack/react-query';

import { bangumiCatalogProvider } from '@/infrastructure/bangumi/catalog/provider';
import { queryKeys } from '@/lib/query-keys';

const CATALOG_QUERY_VERSION = 4;

export function useCatalogSubject(subjectId: number) {
  return useQuery({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    queryFn: () => bangumiCatalogProvider.getSubject(subjectId),
    queryKey: queryKeys.catalogSubject(subjectId, CATALOG_QUERY_VERSION),
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });
}
