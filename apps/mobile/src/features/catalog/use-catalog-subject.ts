import { useQuery } from '@tanstack/react-query';

import { bangumiCatalogProvider } from '@/infrastructure/bangumi/catalog/provider';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

import {
  loadOfflineSubject,
  saveOfflineSubject,
} from './offline-subject-pack.ts';

const CATALOG_QUERY_VERSION = 4;

export function useCatalogSubject(subjectId: number) {
  return useQuery({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    meta: PUBLIC_QUERY_META,
    queryFn: async ({ signal }) => {
      try {
        const subject = await bangumiCatalogProvider.getSubject(
          subjectId,
          signal,
        );
        await saveOfflineSubject(subject);
        return subject;
      } catch (error) {
        if (signal?.aborted) throw error;
        const packed = await loadOfflineSubject(subjectId);
        if (packed) return packed;
        throw error;
      }
    },
    queryKey: queryKeys.catalogSubject(subjectId, CATALOG_QUERY_VERSION),
    retry: shouldRetryBangumiQuery,
    staleTime: 5 * 60 * 1000,
  });
}
