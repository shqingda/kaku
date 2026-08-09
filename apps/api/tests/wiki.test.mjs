import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';
import { parseBangumiWikiFeed } from '../src/wiki/bangumi-client.ts';

const WIKI_HTML = `
  <ul id="wiki_act-all" class="sideTpcList wikiScrollBlock">
    <li class="line_odd">
      <a href="/subject/692390" target="_blank" class="l">Kaku &amp; Bangumi</a>
      <small class="grey">
        (内容扩充) by <a href="/user/kaku-user">Kaku 用户</a>
        <a href="/user/kaku-user" class="tip_i">@kaku-user</a>
        <span class="rr">2026-8-9 12:47 / <a href="/subject/692390/edit?rev[]=1905717&amp;diff=prev#revisionComparison" class="l">对比</a></span>
      </small>
    </li>
  </ul>
`;

test('Bangumi wiki HTML maps into a stable revision model', () => {
  assert.deepEqual(parseBangumiWikiFeed(WIKI_HTML), {
    items: [{
      author: 'Kaku 用户',
      authorUsername: 'kaku-user',
      editedAt: 1_786_250_820,
      note: '内容扩充',
      revisionUrl: 'https://bgm.tv/subject/692390/edit?rev[]=1905717&diff=prev#revisionComparison',
      subjectId: 692390,
      title: 'Kaku & Bangumi',
    }],
  });
});

test('public wiki route returns parsed revisions', async () => {
  const fetcher = async (input) => {
    assert.equal(String(input), 'https://bgm.tv/wiki');
    return new Response(WIKI_HTML);
  };
  const response = await createApp({ fetcher }).request('/public/wiki/revisions');

  assert.equal(response.status, 200);
  assert.equal((await response.json()).items[0].subjectId, 692390);
});

test('public wiki route falls back to bangumi.tv when bgm.tv is unavailable', async () => {
  const requestedUrls = [];
  const fetcher = async (input) => {
    requestedUrls.push(String(input));
    return requestedUrls.length === 1
      ? new Response('Bad gateway', { status: 502 })
      : new Response(WIKI_HTML);
  };
  const response = await createApp({ fetcher }).request('/public/wiki/revisions');

  assert.equal(response.status, 200);
  assert.deepEqual(requestedUrls, [
    'https://bgm.tv/wiki',
    'https://bangumi.tv/wiki',
  ]);
});
