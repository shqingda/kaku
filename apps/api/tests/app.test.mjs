import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';

test('health endpoint reports that the API is ready', async () => {
  const response = await createApp().request('/health');

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    service: 'kaku-api',
    status: 'ok',
  });
});

test('unknown endpoints return a stable JSON error', async () => {
  const response = await createApp().request('/missing');

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: 'not_found',
    message: '没有找到这个 API 路由。',
  });
});

test('episode comments are registered as an authenticated route', async () => {
  const response = await createApp({ createStore: () => ({}) }).request(
    '/me/episodes/987/comments',
    {
      body: JSON.stringify({
        content: '测试回复',
        turnstileToken: 'turnstile-token',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    { DB: {} },
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: 'unauthorized',
    message: '请先登录 Kaku。',
  });
});

test('restricted subject topics are registered as an authenticated route', async () => {
  const response = await createApp({ createStore: () => ({}) }).request(
    '/me/subject-topics/22447',
    undefined,
    { DB: {} },
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: 'unauthorized',
    message: '请先登录 Kaku。',
  });
});

test('restricted community reads are registered as authenticated routes', async () => {
  const app = createApp({ createStore: () => ({}) });
  const paths = [
    '/me/group-topics/123',
    '/me/episodes/987/comments',
    '/me/reviews/378109',
  ];

  for (const path of paths) {
    const response = await app.request(path, undefined, { DB: {} });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: 'unauthorized',
      message: '请先登录 Kaku。',
    });
  }
});

test('review replies are registered as an authenticated route', async () => {
  const response = await createApp({ createStore: () => ({}) }).request(
    '/me/reviews/378109/replies',
    {
      body: JSON.stringify({
        content: '测试回复',
        turnstileToken: 'turnstile-token',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    { DB: {} },
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: 'unauthorized',
    message: '请先登录 Kaku。',
  });
});

test('notifications are registered as an authenticated route', async () => {
  const response = await createApp({ createStore: () => ({}) }).request(
    '/me/notifications',
    undefined,
    { DB: {} },
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: 'unauthorized',
    message: '请先登录 Kaku。',
  });
});

test('marking notifications read is an authenticated route', async () => {
  const response = await createApp({ createStore: () => ({}) }).request(
    '/me/notifications/read',
    {
      body: JSON.stringify({ ids: [42] }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    { DB: {} },
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: 'unauthorized',
    message: '请先登录 Kaku。',
  });
});

test('entity collections are registered as authenticated routes', async () => {
  const app = createApp({ createStore: () => ({}) });

  for (const [method, body] of [
    ['GET', undefined],
    ['PUT', JSON.stringify({ collected: true })],
  ]) {
    const response = await app.request(
      '/me/entities/character/1/collection',
      {
        body,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        method,
      },
      { DB: {} },
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: 'unauthorized',
      message: '请先登录 Kaku。',
    });
  }
});

test('friend actions are registered as authenticated routes', async () => {
  const app = createApp({ createStore: () => ({}) });

  for (const [method, path] of [
    ['GET', '/me/users/friend-a'],
    ['PUT', '/me/friends/friend-a'],
    ['DELETE', '/me/friends/friend-a'],
  ]) {
    const response = await app.request(path, { method }, { DB: {} });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: 'unauthorized',
      message: '请先登录 Kaku。',
    });
  }
});

test('friend actions reject malformed usernames before authentication', async () => {
  const app = createApp({ createStore: () => ({}) });

  for (const [method, path] of [
    ['GET', '/me/users/bad%20name'],
    ['PUT', '/me/friends/bad%20name'],
    ['DELETE', '/me/friends/bad%20name'],
  ]) {
    const response = await app.request(path, { method }, { DB: {} });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: 'invalid_username',
      message: '用户名格式不正确。',
    });
  }
});

test('topic creation is registered as authenticated routes', async () => {
  const app = createApp({ createStore: () => ({}) });
  const body = JSON.stringify({
    content: '内容',
    title: '标题',
    turnstileToken: 'turnstile-token',
  });

  for (const path of ['/me/subjects/22447/topics', '/me/groups/anime/topics']) {
    const response = await app.request(
      path,
      {
        body,
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
      { DB: {} },
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: 'unauthorized',
      message: '请先登录 Kaku。',
    });
  }
});

test('reply deletion is registered as authenticated routes', async () => {
  const app = createApp({ createStore: () => ({}) });

  for (const path of ['/me/subject-posts/9001', '/me/group-posts/9002']) {
    const response = await app.request(path, { method: 'DELETE' }, { DB: {} });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: 'unauthorized',
      message: '请先登录 Kaku。',
    });
  }
});

test('episode and blog comment edits are authenticated routes', async () => {
  const app = createApp({ createStore: () => ({}) });

  for (const path of [
    '/me/episode-comments/9100',
    '/me/blog-comments/9200',
  ]) {
    const response = await app.request(
      path,
      {
        body: JSON.stringify({ content: '内容' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      },
      { DB: {} },
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: 'unauthorized',
      message: '请先登录 Kaku。',
    });
  }
});

test('blocklist actions are registered as authenticated routes', async () => {
  const app = createApp({ createStore: () => ({}) });

  for (const [method, path] of [
    ['GET', '/me/blocklist'],
    ['PUT', '/me/blocklist/spammer'],
    ['DELETE', '/me/blocklist/spammer'],
  ]) {
    const response = await app.request(path, { method }, { DB: {} });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: 'unauthorized',
      message: '请先登录 Kaku。',
    });
  }
});

test('reporting is registered as an authenticated route', async () => {
  const response = await createApp({ createStore: () => ({}) }).request(
    '/me/reports',
    {
      body: JSON.stringify({ id: 1, reason: 1, type: 6 }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    { DB: {} },
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: 'unauthorized',
    message: '请先登录 Kaku。',
  });
});

test('creating an index is registered as an authenticated route', async () => {
  const response = await createApp({ createStore: () => ({}) }).request(
    '/me/indexes',
    {
      body: JSON.stringify({ desc: '', title: '标题' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    { DB: {} },
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: 'unauthorized',
    message: '请先登录 Kaku。',
  });
});

test('editing and deleting an index are authenticated routes', async () => {
  const app = createApp({ createStore: () => ({}) });

  for (const [method, body] of [
    ['PATCH', JSON.stringify({ desc: '', title: '标题' })],
    ['DELETE', undefined],
  ]) {
    const response = await app.request(
      '/me/indexes/20201',
      {
        body,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        method,
      },
      { DB: {} },
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: 'unauthorized',
      message: '请先登录 Kaku。',
    });
  }
});
