import assert from 'node:assert/strict';
import test from 'node:test';

import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';
import { BangumiRequestError } from '../src/infrastructure/bangumi/transport/http-client.ts';
import { userErrorMessage } from '../src/lib/user-error-message.ts';

test('KakuApiError maps auth, permission, missing, and rate-limit statuses', () => {
  assert.equal(
    userErrorMessage(new KakuApiError('token expired', 401)),
    '登录已失效，请重新登录。',
  );
  assert.equal(
    userErrorMessage(new KakuApiError('forbidden', 403)),
    '没有权限执行这个操作。',
  );
  assert.equal(
    userErrorMessage(new KakuApiError('gone', 404)),
    '内容不存在或已删除。',
  );
  assert.equal(
    userErrorMessage(new KakuApiError('slow down', 429)),
    '请求太频繁，请稍后再试。',
  );
});

test('KakuApiError maps 5xx to service downtime and other statuses to the fallback', () => {
  assert.equal(
    userErrorMessage(new KakuApiError('boom', 500)),
    '服务暂时不可用，请稍后重试。',
  );
  assert.equal(
    userErrorMessage(new KakuApiError('boom', 503)),
    '服务暂时不可用，请稍后重试。',
  );
  assert.equal(
    userErrorMessage(new KakuApiError('bad request', 400)),
    '暂时没有成功，请稍后重试。',
  );
  assert.equal(
    userErrorMessage(new KakuApiError('conflict', 409), '自定义失败提示'),
    '自定义失败提示',
  );
});

test('BangumiRequestError maps rate limit, 5xx, other statuses, and no status', () => {
  assert.equal(
    userErrorMessage(new BangumiRequestError('slow down', 429)),
    '请求太频繁，请稍后再试。',
  );
  assert.equal(
    userErrorMessage(new BangumiRequestError('bad gateway', 502)),
    'Bangumi 服务暂时不可用，请稍后重试。',
  );
  assert.equal(
    userErrorMessage(new BangumiRequestError('not found', 404)),
    'Bangumi 返回了 404，请稍后重试。',
  );
  assert.equal(
    userErrorMessage(new BangumiRequestError('network unreachable')),
    'Bangumi 没有响应，请稍后重试。',
  );
});

test('Abort errors and network TypeErrors get network-flavored copy', () => {
  const abortError = new Error('The operation was aborted');
  abortError.name = 'AbortError';

  assert.equal(
    userErrorMessage(abortError),
    '请求超时，请检查网络后重试。',
  );
  assert.equal(
    userErrorMessage(new TypeError('Network request failed')),
    '网络连接失败，请检查网络后重试。',
  );
});

test('Unknown values fall back to the default or the provided message', () => {
  assert.equal(userErrorMessage('boom'), '暂时没有成功，请稍后重试。');
  assert.equal(userErrorMessage(undefined), '暂时没有成功，请稍后重试。');
  assert.equal(userErrorMessage(new Error('boom'), '请重试'), '请重试');
});
