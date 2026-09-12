type PersistableQuery = {
  meta?: Record<string, unknown>;
  state: {
    dataUpdatedAt: number;
    status: string;
  };
};

export const QUERY_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;
export const PUBLIC_QUERY_META = { persist: true } as const;
// 私有（登录态）查询也写入本地缓存：冷启动/弱网下收藏、进度、通知
// 立即有 stale 数据可渲染，不再白屏转圈。安全边界：
// - maxAge 24h：超过一天的私有缓存水合时即被丢弃；
// - 登出时 auth-provider removeQueries(private) 会触发 persister 重写，
//   SQLite 里的私有条目随之清除（应用被杀时残留的私有缓存也会在
//   下一次登出态冷启动的水合后被同样的 removeQueries 循环清掉）。
// 已知取舍：登出态冷启动的水合瞬间可能闪现上一会话的私有数据，
// 随后被清除——个人设备可接受，不做额外的加密存储。
export const PRIVATE_QUERY_META = { private: true, persist: true } as const;
// Increment this when persisted public query shapes change. It prevents an
// older native install from hydrating data that current screens cannot read.
export const QUERY_CACHE_BUSTER = 'public-catalog-v2';

export function isPrivateQuery(query: { meta?: Record<string, unknown> }) {
  return query.meta?.private === true;
}

export function shouldPersistPublicQuery(query: PersistableQuery) {
  return (
    query.meta?.persist === true &&
    query.state.status === 'success' &&
    query.state.dataUpdatedAt > 0
  );
}
