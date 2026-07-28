const REQUEST_TIMEOUT_MS = 12_000;

type RequestOptions = {
  body?: string;
  method?: 'GET' | 'POST';
};

type RequesterConfig = {
  baseUrl: string;
  failedMessage: (status: number) => string;
  networkMessage: string;
  timeoutMessage: string;
};

export class BangumiRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'BangumiRequestError';
  }
}

export function createBangumiRequester(config: RequesterConfig) {
  return async function requestJson(
    path: string,
    options?: RequestOptions,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch(`${config.baseUrl}${path}`, {
        headers: {
          Accept: 'application/json',
          ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
          'User-Agent':
            'Kaku/0.1 (Bangumi third-party client; development)',
        },
        body: options?.body,
        method: options?.method,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new BangumiRequestError(
          config.failedMessage(response.status),
          response.status,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof BangumiRequestError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new BangumiRequestError(config.timeoutMessage);
      }

      throw new BangumiRequestError(config.networkMessage);
    } finally {
      clearTimeout(timeout);
    }
  };
}
