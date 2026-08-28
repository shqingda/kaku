import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import { fetchBangumiStatus } from './bangumi-status';

// 状态页自身有 20 秒 HTTP 缓存，客户端 1 分钟内直接复用快照即可。
const STATUS_STALE_MS = 60 * 1000;

export function useBangumiStatus() {
  return useQuery({
    queryFn: ({ signal }) => fetchBangumiStatus(signal),
    queryKey: queryKeys.bangumiStatus(),
    staleTime: STATUS_STALE_MS,
  });
}
