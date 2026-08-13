type PersistableQuery = {
  meta?: Record<string, unknown>;
  state: {
    dataUpdatedAt: number;
    status: string;
  };
};

export const QUERY_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;
export const PUBLIC_QUERY_META = { persist: true } as const;
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
