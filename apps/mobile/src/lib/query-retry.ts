type ErrorWithStatus = {
  status?: unknown;
};

export function shouldRetryBangumiQuery(
  failureCount: number,
  error: unknown,
) {
  const statusCandidate =
    typeof error === 'object' && error !== null
      ? (error as ErrorWithStatus).status
      : undefined;
  const status =
    typeof statusCandidate === 'number'
      ? statusCandidate
      : undefined;

  if (
    status !== undefined &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 429
  ) {
    return false;
  }

  return failureCount < 2;
}

export function bangumiRetryDelay(attemptIndex: number) {
  return Math.min(600 * 2 ** attemptIndex, 3_000);
}
