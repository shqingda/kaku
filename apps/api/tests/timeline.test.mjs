import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createBangumiTimelineSay,
  getBangumiFriendTimeline,
} from '../src/timeline/bangumi-client.ts';

test('Bangumi friend timeline maps private API data into Kaku models', async () => {
  const fetcher = async (_input, init) => {
    assert.equal(init.headers.Authorization, 'Bearer access-token');

    return Response.json([
      {
        batch: false,
        cat: 5,
        createdAt: 1_785_940_000,
        id: 42,
        memo: { status: { tsukkomi: '今天也要看动画。' } },
        replies: 2,
        source: { name: 'web' },
        type: 1,
        uid: 7,
        user: {
          avatar: { small: 'https://lain.bgm.tv/avatar.jpg' },
          nickname: 'Kaku 用户',
          username: 'kaku-user',
        },
      },
    ]);
  };

  const items = await getBangumiFriendTimeline({
    accessToken: 'access-token',
    fetcher,
  });

  assert.deepEqual(items, [
    {
      createdAt: 1_785_940_000,
      id: 42,
      replies: 2,
      subjectId: undefined,
      text: '今天也要看动画。',
      user: {
        avatarUrl: 'https://lain.bgm.tv/avatar.jpg',
        nickname: 'Kaku 用户',
        username: 'kaku-user',
      },
    },
  ]);
});

test('Bangumi friend timeline skips an event whose user is unavailable', async () => {
  const fetcher = async () =>
    Response.json([
      {
        batch: false,
        cat: 5,
        createdAt: 1_785_940_000,
        id: 43,
        memo: { status: { tsukkomi: '这条动态没有用户。' } },
        replies: 0,
        source: { name: 'web' },
        type: 1,
        uid: 8,
      },
    ]);

  const items = await getBangumiFriendTimeline({
    accessToken: 'access-token',
    fetcher,
  });

  assert.deepEqual(items, []);
});

test('publishing a timeline say keeps OAuth and Turnstile credentials server-side', async () => {
  const fetcher = async (input, init) => {
    assert.equal(String(input), 'https://next.bgm.tv/p1/timeline');
    assert.equal(init.headers.Authorization, 'Bearer access-token');
    assert.deepEqual(JSON.parse(init.body), {
      content: '今天也要看动画。',
      turnstileToken: 'single-use-token',
    });

    return Response.json({ id: 99 });
  };

  const result = await createBangumiTimelineSay({
    accessToken: 'access-token',
    content: '今天也要看动画。',
    fetcher,
    turnstileToken: 'single-use-token',
  });

  assert.deepEqual(result, { id: 99 });
});

test('an expired Turnstile token stays distinct from an expired OAuth token', async () => {
  const fetcher = async () =>
    Response.json(
      { code: 'CAPTCHA_ERROR', message: 'wrong captcha' },
      { status: 401 },
    );

  await assert.rejects(
    createBangumiTimelineSay({
      accessToken: 'still-valid-access-token',
      content: '今天也要看动画。',
      fetcher,
      turnstileToken: 'expired-token',
    }),
    (error) =>
      error.status === 401 &&
      error.code === 'CAPTCHA_ERROR' &&
      /安全验证已过期/.test(error.message),
  );
});
