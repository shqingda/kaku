import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';
import { parseBangumiBlogPage } from '../src/blogs/bangumi-client.ts';

const BLOG_HTML = `
  <div id="entry_list" class="entry-list">
    <div class="item clearit" data-item-user="kaku-user">
      <p class="cover"><img src="//lain.bgm.tv/cover.jpg" /></p>
      <div class="entry">
        <h2 class="title"><a href="/blog/378257" class="l">Kaku &amp; Bangumi</a></h2>
        <div class="content"><a href="/blog/378257">第一行<br />第二行 ...</a></div>
        <div class="tools"><div class="time">
          <a href="/user/kaku-user" class="l">Kaku 用户</a>&nbsp;·
          2026-8-9 09:22&nbsp;·
          <a href="/blog/378257" class="l">5 回复</a>
        </div></div>
      </div>
    </div>
  </div>
  <div class="page_inner"><span class="p_edge">(&nbsp;1&nbsp;/&nbsp;3&nbsp;)</span></div>
`;

test('Bangumi blog HTML maps into a stable public model', () => {
  const page = parseBangumiBlogPage(BLOG_HTML, 1);

  assert.deepEqual(page, {
    items: [
      {
        author: 'Kaku 用户',
        authorUsername: 'kaku-user',
        coverUrl: 'https://lain.bgm.tv/cover.jpg',
        id: 378257,
        replyCount: 5,
        summary: '第一行 第二行 ...',
        title: 'Kaku & Bangumi',
        updatedAt: 1_786_238_520,
      },
    ],
    nextPage: 2,
    page: 1,
    totalPages: 3,
  });
});

test('public blogs route validates and forwards its channel page', async () => {
  const fetcher = async (input) => {
    assert.equal(String(input), 'https://bgm.tv/anime/blog/2.html');
    return new Response(BLOG_HTML, {
      headers: { 'Content-Type': 'text/html' },
    });
  };
  const response = await createApp({ fetcher }).request(
    '/public/blogs?type=anime&page=2',
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.items[0].id, 378257);
  assert.equal(body.page, 2);
  assert.equal(body.nextPage, 3);
});
