const REQUEST_TIMEOUT_MS = 12_000;
const BANGUMI_USER_AGENT = 'Kaku/1.0 (https://github.com/shqingda/kaku)';

type RequestOptions = {
  body?: string;
  method?: 'GET' | 'POST';
  signal?: AbortSignal;
};

type RequesterConfig = {
  baseUrl: string;
  failedMessage: (status: number) => string;
  networkMessage: string;
  timeoutMessage: string;
};

export class BangumiRequestError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'BangumiRequestError';
    this.status = status;
  }
}

export function createBangumiRequester(config: RequesterConfig) {
  return async function requestJson(
    path: string,
    options?: RequestOptions,
  ): Promise<unknown> {
    const controller = new AbortController();
    let didTimeout = false;
    const abortRequest = () => controller.abort();
    const timeout = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    if (options?.signal?.aborted) {
      controller.abort();
    } else {
      options?.signal?.addEventListener('abort', abortRequest, { once: true });
    }

    try {
      const response = await fetch(`${config.baseUrl}${path}`, {
        headers: {
          Accept: 'application/json',
          ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
          'User-Agent': BANGUMI_USER_AGENT,
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
        if (!didTimeout && options?.signal?.aborted) {
          throw error;
        }

        throw new BangumiRequestError(config.timeoutMessage);
      }

      throw new BangumiRequestError(config.networkMessage);
    } finally {
      clearTimeout(timeout);
      options?.signal?.removeEventListener('abort', abortRequest);
    }
  };
}
