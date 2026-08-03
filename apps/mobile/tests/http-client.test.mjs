import assert from 'node:assert/strict';
import test from 'node:test';

import { createBangumiRequester } from '../src/infrastructure/bangumi/transport/http-client.ts';

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
    const requestJson = createBangumiRequester({
      baseUrl: 'https://api.example.test',
      failedMessage: (status) => `failed ${status}`,
      networkMessage: 'network failed',
      timeoutMessage: 'timed out',
    });
    const request = requestJson('/collections', {
      signal: controller.signal,
    });

    controller.abort();

    await assert.rejects(request, { name: 'AbortError' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
