const BUSY_MESSAGE = '目录有操作尚未完成或结果未确认，草稿已保留。请稍后重试；若持续出现，请联系维护者。';

export class IndexWriteUnconfirmedError extends Error {
  constructor() {
    super(BUSY_MESSAGE);
    this.name = 'IndexWriteUnconfirmedError';
  }
}

// D1's unique key arbitrates across Worker instances. Never expire an unknown write:
// aborting fetch does not prove that the upstream stopped processing the request.
export async function withIndexWriteLock({
  database,
  userId,
  indexId,
  now,
  fetcher,
  action,
}: {
  database: D1Database;
  userId: number;
  indexId: number;
  now: number;
  fetcher: typeof fetch;
  action: (fetcher: typeof fetch) => Promise<unknown>;
}): Promise<unknown> {
  const operationId = crypto.randomUUID();
  const claim = await database.prepare(
    'INSERT INTO index_write_locks (user_id, index_id, operation_id, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (user_id, index_id) DO NOTHING',
  ).bind(userId, indexId, operationId, now).run();
  if (claim.meta.changes !== 1) {
    throw new IndexWriteUnconfirmedError();
  }

  let unconfirmed = false;
  const guardedFetch: typeof fetch = async (input, init) => {
    const writing = init?.method === 'PATCH' || init?.method === 'DELETE';
    if (!writing) return fetcher(input, init);
    unconfirmed = true;
    try {
      const response = await fetcher(input, {
        ...init,
        signal: AbortSignal.timeout(12_000),
      });
      // These explicit rejections did not perform the operation. A timeout/5xx
      // or unexpected response can follow a committed write: keep the claim.
      if ([200, 204, 400, 401, 403, 404, 405, 409, 412, 422, 429].includes(response.status)) {
        unconfirmed = false;
        return response;
      }
    } catch {
      // Outcome is unknown; retain the claim, including across process restarts.
    }
    throw new IndexWriteUnconfirmedError();
  };

  try {
    return await action(guardedFetch);
  } finally {
    if (!unconfirmed) {
      await database.prepare(
        'DELETE FROM index_write_locks WHERE user_id = ? AND index_id = ? AND operation_id = ?',
      ).bind(userId, indexId, operationId).run();
    }
  }
}
