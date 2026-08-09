import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';
import { parseBangumiTagPage } from '../src/tags/bangumi-client.ts';

const TAG_HTML = `
  <div id="tagList">
    <a href="/anime/tag/TV" class="l level1">TV</a><small class="grey">(1395309)</small>
    <a href="/anime/tag/Sci-Fi" class="l level2">科幻 &amp; 冒险</a><small class="grey">(5219)</small>
  </div>
  <hr class="board" />
  <span class="p_edge">(&nbsp;1&nbsp;/&nbsp;21&nbsp;)</span>
`;

test('Bangumi tag HTML maps into a stable public model', () => {
  assert.deepEqual(parseBangumiTagPage(TAG_HTML, 1), {
    items: [
      { count: 1_395_309, name: 'TV' },
      { count: 5_219, name: '科幻 & 冒险' },
    ],
    nextPage: 2,
    page: 1,
    totalPages: 21,
  });
});

test('public tags route maps media type and pagination', async () => {
  const fetcher = async (input) => {
    assert.equal(String(input), 'https://bgm.tv/book/tag?page=2');
    return new Response(TAG_HTML);
  };
  const response = await createApp({ fetcher }).request(
    '/public/tags?type=1&page=2',
  );

  assert.equal(response.status, 200);
  assert.equal((await response.json()).items[1].name, '科幻 & 冒险');
});

test('public tags route rejects invalid media types and pages', async () => {
  const response = await createApp().request('/public/tags?type=5&page=0');
  assert.equal(response.status, 400);
});
