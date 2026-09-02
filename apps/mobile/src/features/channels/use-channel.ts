import {
  type QueryClient,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import { router } from 'expo-router';

import { getSubjectTypeSlug } from '@/features/catalog/subject-types';
import { getChannelSubjects } from '@/infrastructure/kaku/channels-client';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

export function channelQueryOptions(subjectType: number) {
  return queryOptions({
    meta: PUBLIC_QUERY_META,
    queryFn: ({ signal }) => getChannelSubjects(subjectType, signal),
    queryKey: queryKeys.channel(subjectType),
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 60 * 1000,
  });
}

export function useChannel(subjectType: number) {
  return useQuery(channelQueryOptions(subjectType));
}

export function prefetchChannel(queryClient: QueryClient, subjectType = 2) {
  void queryClient.prefetchQuery(channelQueryOptions(subjectType));
  void router.prefetch({
    pathname: '/channel/[type]',
    params: { type: getSubjectTypeSlug(subjectType) },
  });
}
