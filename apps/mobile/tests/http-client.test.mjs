import assert from 'node:assert/strict';
import test from 'node:test';

import { createBangumiRequester } from '../src/infrastructure/bangumi/transport/http-client.ts';

const config = {
  baseUrl: 'https://api.example.test',
  failedMessage: (status) => `failed ${status}`,
  networkMessage: 'network failed',
  timeoutMessage: 'timed out',
};

test('cancelled queries abort their Bangumi request without becoming timeouts', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) =>
    new Promise((_resolve, reject) => {
      const rejectAsAborted = () =>
        reject(new DOMException('The request was aborted', 'AbortError'));

      if (options?.signal?.aborted) {
        rejectAsAborted();
        return;
      }

      options?.signal?.addEventListener('abort', rejectAsAborted, {
        once: true,
      });
    });

  try {
    const controller = new AbortController();
    const requestJson = createBangumiRequester(config);
    const request = requestJson('/collections', {
      signal: controller.signal,
    });

    controller.abort();

    await assert.rejects(request, { name: 'AbortError' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('non-2xx responses throw the configured failure message and status', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('nope', { status: 503 });

  try {
    const requestJson = createBangumiRequester(config);

    await assert.rejects(requestJson('/collections'), {
      name: 'BangumiRequestError',
      message: 'failed 503',
      status: 503,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('network failures throw the configured network message', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch');
  };

  try {
    const requestJson = createBangumiRequester(config);

    await assert.rejects(requestJson('/collections'), {
      name: 'BangumiRequestError',
      message: 'network failed',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('slow requests time out after the deadline', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) =>
    new Promise((_resolve, reject) => {
      options?.signal?.addEventListener(
        'abort',
        () => reject(new DOMException('The request was aborted', 'AbortError')),
        { once: true },
      );
    });

  t.mock.timers.enable({ apis: ['setTimeout'] });

  try {
    const requestJson = createBangumiRequester(config);
    const request = requestJson('/slow');

    t.mock.timers.tick(12_000);

    await assert.rejects(request, {
      name: 'BangumiRequestError',
      message: 'timed out',
    });
  } finally {
    t.mock.timers.reset();
    globalThis.fetch = originalFetch;
  }
});
