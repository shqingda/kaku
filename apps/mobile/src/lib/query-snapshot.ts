import type { PersistedClient } from '@tanstack/react-query-persist-client';

import { QUERY_CACHE_MAX_AGE, shouldPersistPublicQuery } from './query-persistence.ts';

export const QUERY_SNAPSHOT_MAX_QUERIES = 100;
export const QUERY_SNAPSHOT_MAX_BYTES = 2 * 1024 * 1024;
const MAX_PAGES = 2;

function utf8ByteLength(value: string) {
  let bytes = 0;
  for (const character of value) {
    const code = character.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function trimPages(data: unknown) {
  if (!data || typeof data !== 'object' || !('pages' in data) || !('pageParams' in data)) {
    return data;
  }
  if (!Array.isArray(data.pages) || !Array.isArray(data.pageParams)) return data;

  const count = Math.min(MAX_PAGES, data.pages.length, data.pageParams.length);
  return {
    ...data,
    pages: data.pages.slice(0, count),
    pageParams: data.pageParams.slice(0, count),
  };
}

// 只限制写盘/恢复的快照，不裁掉当前正在浏览的列表，也不影响独立离线资料。
// 旧快照使用同一格式和 buster，读取时按同样规则收窄即可。
export function boundQuerySnapshot(client: PersistedClient, now = Date.now()): PersistedClient {
  const snapshot: PersistedClient = {
    ...client,
    clientState: { ...client.clientState, mutations: [], queries: [] },
  };
  let bytes = utf8ByteLength(JSON.stringify(snapshot));
  if (bytes > QUERY_SNAPSHOT_MAX_BYTES) {
    throw new Error('Query cache metadata exceeds the snapshot size limit');
  }

  const recent = client.clientState.queries
    .filter((query) => shouldPersistPublicQuery(query)
      && now - query.state.dataUpdatedAt <= QUERY_CACHE_MAX_AGE)
    .sort((left, right) => right.state.dataUpdatedAt - left.state.dataUpdatedAt)
    .slice(0, QUERY_SNAPSHOT_MAX_QUERIES);

  for (const query of recent) {
    const trimmed = {
      ...query,
      state: { ...query.state, data: trimPages(query.state.data) },
    };
    // 加上数组元素之间的逗号；中文和 emoji 按 UTF-8 字节而非字符数量计算。
    const addedBytes = utf8ByteLength(JSON.stringify(trimmed))
      + (snapshot.clientState.queries.length > 0 ? 1 : 0);
    if (bytes + addedBytes > QUERY_SNAPSHOT_MAX_BYTES) continue;
    snapshot.clientState.queries.push(trimmed);
    bytes += addedBytes;
  }
  return snapshot;
}

export function serializeQuerySnapshot(client: PersistedClient): string {
  return JSON.stringify(boundQuerySnapshot(client));
}

export function deserializeQuerySnapshot(value: string): PersistedClient {
  return boundQuerySnapshot(JSON.parse(value));
}
