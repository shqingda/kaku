import { useCallback, useEffect, useRef } from 'react';
import {
  type QueryClient,
  queryOptions,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { getCatalogSubject } from '@/infrastructure/bangumi/catalog/provider';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

import {
  loadOfflineSubject,
  saveOfflineSubject,
} from './offline-subject-pack.ts';

const CATALOG_QUERY_VERSION = 4;

export function catalogSubjectQueryOptions(subjectId: number) {
  return queryOptions({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    meta: PUBLIC_QUERY_META,
    queryFn: async ({ signal }) => {
      try {
        const subject = await getCatalogSubject(subjectId, signal);
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

export function useCatalogSubject(subjectId: number) {
  return useQuery(catalogSubjectQueryOptions(subjectId));
}

export function prefetchCatalogSubject(
  queryClient: QueryClient,
  subjectId: number,
) {
  if (!Number.isInteger(subjectId) || subjectId <= 0) return;
  // 只预取 Query 数据。router.prefetch 会把条目页预挂进原生栈，
  // ZoomTransitionEnabler 还没带上 source id，Link.AppleZoom 就会退化成普通 push。
  void queryClient.prefetchQuery(catalogSubjectQueryOptions(subjectId));
}

export function usePrefetchSubject() {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current == null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const prefetch = useCallback(
    (subjectId: number) => {
      cancel();
      // 等一小段再发请求：列表滑动时 pressIn 会误触发，pressOut 会取消。
      timerRef.current = setTimeout(() => {
        prefetchCatalogSubject(queryClient, subjectId);
        timerRef.current = null;
      }, 50);
    },
    [cancel, queryClient],
  );

  return { cancel, prefetch };
}
