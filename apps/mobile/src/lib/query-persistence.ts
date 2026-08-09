type PersistableQuery = {
  meta?: Record<string, unknown>;
  state: {
    dataUpdatedAt: number;
    status: string;
  };
};

export const QUERY_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;
export const QUERY_CACHE_BUSTER = 'public-catalog-v1';

export function shouldPersistPublicQuery(query: PersistableQuery) {
  return (
    query.meta?.persist === true &&
    query.state.status === 'success' &&
    query.state.dataUpdatedAt > 0
  );
}
