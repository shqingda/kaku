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

  assert.deepEqual(items, {
    items: [
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
    ],
    nextUntil: undefined,
  });
});

test('Bangumi collection timeline keeps its exact action and subject title', async () => {
  const fetcher = async () =>
    Response.json([
      {
        batch: false,
        cat: 3,
        createdAt: 1_785_940_000,
        id: 44,
        memo: {
          subject: [
            {
              comment: '',
              subject: {
                id: 400602,
                name: '葬送のフリーレン',
                nameCN: '葬送的芙莉莲',
                type: 2,
              },
            },
          ],
        },
        replies: 0,
        type: 6,
        user: {
          avatar: {},
          nickname: '好友 A',
          username: 'friend-a',
        },
      },
    ]);

  const page = await getBangumiFriendTimeline({
    accessToken: 'access-token',
    fetcher,
  });

  assert.deepEqual(page.items[0], {
    createdAt: 1_785_940_000,
    id: 44,
    leadingText: '看过 ',
    replies: 0,
    subjectId: 400602,
    subjectTitle: '葬送的芙莉莲',
    text: '看过 《葬送的芙莉莲》',
    trailingText: '',
    user: {
      avatarUrl: undefined,
      nickname: '好友 A',
      username: 'friend-a',
    },
  });
});

test('Bangumi batch progress timeline exposes completed episode counts', async () => {
  const fetcher = async () =>
    Response.json([
      {
        batch: true,
        cat: 4,
        createdAt: 1_785_940_000,
        id: 45,
        memo: {
          progress: {
            batch: {
              epsTotal: '12',
              epsUpdate: 5,
              subject: {
                id: 495291,
                name: '機動戦士Gundam GQuuuuuuX',
                nameCN: '机动战士高达 GQuuuuuuX',
                type: 2,
              },
              volsTotal: '0',
            },
          },
        },
        replies: 0,
        type: 0,
        user: {
          avatar: {},
          nickname: '好友 A',
          username: 'friend-a',
        },
      },
    ]);

  const page = await getBangumiFriendTimeline({
    accessToken: 'access-token',
    fetcher,
  });

  assert.equal(page.items[0]?.leadingText, '完成了 ');
  assert.equal(page.items[0]?.subjectTitle, '机动战士高达 GQuuuuuuX');
  assert.equal(page.items[0]?.trailingText, ' 5 of 12 话');
  assert.equal(
    page.items[0]?.text,
    '完成了 《机动战士高达 GQuuuuuuX》 5 of 12 话',
  );
});

test('Bangumi daily timeline keeps its real action', async () => {
  const fetcher = async () =>
    Response.json([
      {
        batch: false,
        cat: 1,
        createdAt: 1_785_940_000,
        id: 46,
        memo: {},
        replies: 0,
        type: 1,
        user: {
          avatar: {},
          nickname: '好友 A',
          username: 'friend-a',
        },
      },
    ]);

  const page = await getBangumiFriendTimeline({
    accessToken: 'access-token',
    fetcher,
  });

  assert.equal(page.items[0]?.text, '加入了 Bangumi');
});

test('Bangumi friend event keeps the added friend name', async () => {
  const fetcher = async () =>
    Response.json([
      {
        batch: false,
        cat: 1,
        createdAt: 1_785_940_000,
        id: 47,
        memo: {
          daily: {
            users: [
              {
                avatar: {},
                id: 8,
                nickname: '蓝与火',
                username: 'blue-fire',
              },
            ],
          },
        },
        replies: 0,
        type: 2,
        user: { avatar: {}, nickname: '魂', username: 'soul' },
      },
    ]);

  const page = await getBangumiFriendTimeline({
    accessToken: 'access-token',
    fetcher,
  });

  assert.equal(page.items[0]?.text, '将 蓝与火 加为了好友');
});

test('Bangumi entity collection event keeps its person name', async () => {
  const fetcher = async () =>
    Response.json([
      {
        batch: false,
        cat: 8,
        createdAt: 1_785_940_000,
        id: 48,
        memo: {
          mono: {
            characters: [],
            persons: [{ id: 9, name: 'ゆたかめ' }],
          },
        },
        replies: 0,
        type: 1,
        user: { avatar: {}, nickname: 'vxow', username: 'vxow' },
      },
    ]);

  const page = await getBangumiFriendTimeline({
    accessToken: 'access-token',
    fetcher,
  });

  assert.equal(page.items[0]?.text, '收藏了人物 ゆたかめ');
});

test('Bangumi friend timeline uses the last raw id as its next cursor', async () => {
  const fetcher = async (input) => {
    assert.equal(
      String(input),
      'https://next.bgm.tv/p1/timeline?mode=friends&limit=2&until=42',
    );

    return Response.json([
      {
        cat: 5,
        createdAt: 1_785_940_000,
        id: 41,
        memo: { status: { tsukkomi: '第一页。' } },
        replies: 0,
        user: {
          avatar: {},
          nickname: '用户一',
          username: 'user-one',
        },
      },
      {
        cat: 5,
        createdAt: 1_785_930_000,
        id: 40,
        memo: { status: { tsukkomi: '下一页从这里继续。' } },
        replies: 0,
        user: {
          avatar: {},
          nickname: '用户二',
          username: 'user-two',
        },
      },
    ]);
  };

  const page = await getBangumiFriendTimeline({
    accessToken: 'access-token',
    fetcher,
    limit: 2,
    until: 42,
  });

  assert.equal(page.items.length, 2);
  assert.equal(page.nextUntil, 40);
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

  assert.deepEqual(items, { items: [], nextUntil: undefined });
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

test('deleting a timeline item forwards DELETE to the private endpoint', async () => {
  const { deleteBangumiTimeline } = await import('../src/timeline/bangumi-client.ts');
  const fetcher = async (input, init) => {
    assert.equal(String(input), 'https://next.bgm.tv/p1/timeline/70001');
    assert.equal(init.method, 'DELETE');
    assert.equal(init.headers.Authorization, 'Bearer access-token');
    return new Response('{}', { status: 200 });
  };

  await deleteBangumiTimeline({
    accessToken: 'access-token',
    fetcher,
    timelineId: 70001,
  });
});
