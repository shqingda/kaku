import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';
import { parseBangumiIndexPage } from '../src/indexes/bangumi-client.ts';

const INDEX_HTML = `
  <div id="timeline" class="index-list ">
    <ul>
      <li id="item_102245" class="clearit tml_item index-item">
        <span class="avatar">
          <a href="/user/kaku-user" class="avatar"><span class="avatarNeue" style="background-image:url('//lain.bgm.tv/user.jpg')"></span></a>
        </span>
        <span class="info clearit">
          <div class="clearit">
            <span class="stats tip rr">
              <span class="ico_subject_type num"><span class="ico"></span><span class="num">18</span></span>
              <span class="ico_subject_type num"><span class="ico"></span><span class="num">2</span></span>
            </span>
            <a href="/index/102245" class="l"><h3>Kaku &amp; Bangumi</h3></a>
          </div>
          <span class="time tip_i">
            <a href="/user/kaku-user" class="l">Kaku 用户</a> ·
            创建 <span class="tip_j">2026-8-9 09:34</span> ·
            更新 <span class="tip_j">2026-8-9 09:49</span>
          </span>
          <span class="desc">第一行<br />第二行</span>
        </span>
      </li>
    </ul>
  </div>
  <div class="page_inner"><span class="p_edge">(&nbsp;1&nbsp;/&nbsp;3&nbsp;)</span></div>
`;

test('Bangumi index HTML maps into a stable public model', () => {
  const page = parseBangumiIndexPage(INDEX_HTML, 1);

  assert.deepEqual(page, {
    items: [
      {
        author: 'Kaku 用户',
        authorAvatarUrl: 'https://lain.bgm.tv/user.jpg',
        authorUsername: 'kaku-user',
        description: '第一行 第二行',
        id: 102245,
        itemCount: 20,
        title: 'Kaku & Bangumi',
        updatedAt: 1_786_240_140,
      },
    ],
    nextPage: 2,
    page: 1,
    totalPages: 3,
  });
});

test('public indexes route validates and forwards popular pagination', async () => {
  const fetcher = async (input) => {
    assert.equal(
      String(input),
      'https://bgm.tv/index/browser?orderby=collect&page=2',
    );
    return new Response(INDEX_HTML, {
      headers: { 'Content-Type': 'text/html' },
    });
  };
  const response = await createApp({ fetcher }).request(
    '/public/indexes?sort=popular&page=2',
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.items[0].id, 102245);
  assert.equal(body.page, 2);
  assert.equal(body.nextPage, 3);
});

test('public indexes route rejects invalid sort and page', async () => {
  const response = await createApp().request(
    '/public/indexes?sort=unknown&page=0',
  );

  assert.equal(response.status, 400);
});

test('creating an index posts title, description, and visibility to P1', async () => {
  const { createBangumiIndex } = await import('../src/indexes/bangumi-client.ts');
  const fetcher = async (input, init) => {
    assert.equal(String(input), 'https://next.bgm.tv/p1/indexes');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.Authorization, 'Bearer access-token');
    assert.deepEqual(JSON.parse(init.body), {
      desc: '我整理的冷门动画清单',
      private: true,
      title: '冷门动画补完计划',
    });
    return Response.json({ id: 20201 });
  };

  const result = await createBangumiIndex({
    accessToken: 'access-token',
    desc: '我整理的冷门动画清单',
    fetcher,
    isPrivate: true,
    title: '冷门动画补完计划',
  });

  assert.deepEqual(result, { id: 20201 });
});

test('creating an index maps rate limits to a retry message', async () => {
  const { BangumiIndexWriteError, createBangumiIndex } = await import(
    '../src/indexes/bangumi-client.ts'
  );
  const fetcher = async () => new Response('{}', { status: 429 });

  await assert.rejects(
    () =>
      createBangumiIndex({
        accessToken: 'access-token',
        desc: '',
        fetcher,
        title: '标题',
      }),
    (error) => {
      assert.ok(error instanceof BangumiIndexWriteError);
      assert.equal(error.status, 429);
      assert.equal(error.message, '创建得太频繁了，请稍后再试。');
      return true;
    },
  );
});

test('updating an index PATCHes the private index endpoint', async () => {
  const { updateBangumiIndex } = await import('../src/indexes/bangumi-client.ts');
  const fetcher = async (input, init) => {
    assert.equal(String(input), 'https://next.bgm.tv/p1/indexes/20201');
    assert.equal(init.method, 'PATCH');
    assert.equal(init.headers.Authorization, 'Bearer access-token');
    assert.deepEqual(JSON.parse(init.body), {
      desc: '更新后的说明',
      private: false,
      title: '更新后的标题',
    });
    return new Response('{}', { status: 200 });
  };

  await updateBangumiIndex({
    accessToken: 'access-token',
    desc: '更新后的说明',
    fetcher,
    indexId: 20201,
    isPrivate: false,
    title: '更新后的标题',
  });
});

test('deleting an index DELETEs the private index endpoint', async () => {
  const { deleteBangumiIndex } = await import('../src/indexes/bangumi-client.ts');
  const fetcher = async (input, init) => {
    assert.equal(String(input), 'https://next.bgm.tv/p1/indexes/20201');
    assert.equal(init.method, 'DELETE');
    return new Response('{}', { status: 200 });
  };

  await deleteBangumiIndex({
    accessToken: 'access-token',
    fetcher,
    indexId: 20201,
  });
});

test('deleting a missing index maps to a not-found message', async () => {
  const { BangumiIndexWriteError, deleteBangumiIndex } = await import(
    '../src/indexes/bangumi-client.ts'
  );
  const fetcher = async () => new Response('{}', { status: 404 });

  await assert.rejects(
    () => deleteBangumiIndex({ accessToken: 'access-token', fetcher, indexId: 1 }),
    (error) => {
      assert.ok(error instanceof BangumiIndexWriteError);
      assert.equal(error.status, 404);
      assert.equal(error.message, '这个目录已不存在。');
      return true;
    },
  );
});

test('reading an index collection reflects the collectedAt field', async () => {
  const { getBangumiIndexCollection } = await import('../src/indexes/bangumi-client.ts');
  const fetcher = async (input, init) => {
    assert.equal(String(input), 'https://next.bgm.tv/p1/indexes/20201');
    assert.equal(init.headers.Authorization, 'Bearer access-token');
    return Response.json({ collectedAt: 1_785_940_000 });
  };

  const collected = await getBangumiIndexCollection({
    accessToken: 'access-token',
    fetcher,
    indexId: 20201,
  });

  assert.equal(collected, true);
});

test('an uncollected index has no collectedAt', async () => {
  const { getBangumiIndexCollection } = await import('../src/indexes/bangumi-client.ts');
  const fetcher = async () => Response.json({});

  const collected = await getBangumiIndexCollection({
    accessToken: 'access-token',
    fetcher,
    indexId: 20201,
  });

  assert.equal(collected, false);
});

test('collecting an index POSTs to the v0 collect endpoint', async () => {
  const { setBangumiIndexCollection } = await import('../src/indexes/bangumi-client.ts');
  const fetcher = async (input, init) => {
    assert.equal(String(input), 'https://api.bgm.tv/v0/indices/20201/collect');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.Authorization, 'Bearer access-token');
    return new Response(null, { status: 204 });
  };

  const collected = await setBangumiIndexCollection({
    accessToken: 'access-token',
    fetcher,
    indexId: 20201,
    shouldCollect: true,
  });

  assert.equal(collected, true);
});

test('uncollecting an index DELETEs the v0 collect endpoint', async () => {
  const { setBangumiIndexCollection } = await import('../src/indexes/bangumi-client.ts');
  const fetcher = async (input, init) => {
    assert.equal(String(input), 'https://api.bgm.tv/v0/indices/20201/collect');
    assert.equal(init.method, 'DELETE');
    return new Response(null, { status: 204 });
  };

  const collected = await setBangumiIndexCollection({
    accessToken: 'access-token',
    fetcher,
    indexId: 20201,
    shouldCollect: false,
  });

  assert.equal(collected, false);
});
