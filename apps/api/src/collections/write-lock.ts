type CollectionWriteErrorCode = 'collection_write_unconfirmed' | 'collection_partial_success' | 'collection_conflict' | 'collection_baseline_required' | 'invalid_episode_change';

export class CollectionWriteError extends Error {
  readonly code: CollectionWriteErrorCode;
  readonly status: 400 | 409 | 412 | 423 | 428;
  constructor(
    code: CollectionWriteErrorCode,
    message: string,
    status: 400 | 409 | 412 | 423 | 428,
  ) {
    super(message);
    this.name = 'CollectionWriteError';
    this.code = code;
    this.status = status;
  }
}

function unconfirmed() {
  return new CollectionWriteError('collection_write_unconfirmed', '收藏有操作尚未完成或结果待确认。请先刷新确认；若持续出现，请联系维护者。', 423);
}

// Never expire an unknown upstream write: aborting fetch cannot cancel its effect.
export async function withCollectionWriteLock({ database, userId, subjectId, now, fetcher, action }: {
  database: D1Database;
  userId: number;
  subjectId: number;
  now: number;
  fetcher: typeof fetch;
  action: (fetcher: typeof fetch) => Promise<unknown>;
}) {
  const operationId = crypto.randomUUID();
  const claim = await database.prepare(
    'INSERT INTO collection_write_locks (user_id, subject_id, operation_id, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (user_id, subject_id) DO NOTHING',
  ).bind(userId, subjectId, operationId, now).run();
  if (claim.meta.changes !== 1) throw unconfirmed();
  let unknown = false;
  const guardedFetch: typeof fetch = async (input, init) => {
    if (!['POST', 'PATCH'].includes(init?.method ?? 'GET')) return fetcher(input, init);
    unknown = true;
    try {
      const response = await fetcher(input, init);
      if ([200, 201, 204, 400, 401, 403, 404, 405, 409, 412, 422, 429].includes(response.status)) {
        unknown = false;
        return response;
      }
    } catch {
      // The provider may have applied the write before the connection failed.
    }
    throw unconfirmed();
  };
  try {
    return await action(guardedFetch);
  } finally {
    if (!unknown) await database.prepare(
      'DELETE FROM collection_write_locks WHERE user_id = ? AND subject_id = ? AND operation_id = ?',
    ).bind(userId, subjectId, operationId).run();
  }
}
