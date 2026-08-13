import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';

import { getGlobalBlogs } from '@/infrastructure/kaku/blogs-client';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';
import type { BlogFilter, GlobalBlogPage } from './model';

export function useGlobalBlogs(type: BlogFilter) {
  return useInfiniteQuery<
    GlobalBlogPage,
    Error,
    InfiniteData<GlobalBlogPage>,
    ReturnType<typeof queryKeys.globalBlogs>,
    number
  >({
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ pageParam, signal }) =>
      getGlobalBlogs(type, pageParam, signal),
    queryKey: queryKeys.globalBlogs(type),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}
