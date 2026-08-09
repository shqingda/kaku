import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';
import { parseBangumiPeoplePage } from '../src/people-browser/bangumi-client.ts';

const PEOPLE_HTML = `
  <div class="browserCrtList"><div id="item_person4765" class="light_odd clearit">
    <a href="/person/4765" class="avatar"><img src="//lain.bgm.tv/person.jpg" /></a>
    <div class="rr"><a href="/person/4765" class="tip icons_cmt">讨论</a> <small class="na">(+388)</small></div>
    <div><h3><a href="/person/4765" class="l">花澤香菜 </a></h3>
      <div class="prsn_info"><span class="badge_job">声优</span><span class="badge_job">音乐人</span>
      <span class="tip">性别 女 / 生日 1989年2月25日</span></div>
    </div>
  </div></div>
  <div id="multipage"><span class="p_edge">(&nbsp;1&nbsp;/&nbsp;4&nbsp;)</span></div>
`;

test('Bangumi people HTML maps into a stable public model', () => {
  assert.deepEqual(parseBangumiPeoplePage(PEOPLE_HTML, 1), {
    items: [{
      categories: ['声优', '音乐人'],
      commentCount: 388,
      id: 4765,
      imageUrl: 'https://lain.bgm.tv/person.jpg',
      kind: 'person',
      metadata: '性别 女 / 生日 1989年2月25日',
      name: '花澤香菜',
    }],
    nextPage: 2,
    page: 1,
    totalPages: 4,
  });
});

test('public people route forwards filters and pagination', async () => {
  const fetcher = async (input) => {
    assert.equal(
      String(input),
      'https://bgm.tv/person?type=1&gender=2&orderby=collects&page=2',
    );
    return new Response(PEOPLE_HTML);
  };
  const response = await createApp({ fetcher }).request(
    '/public/people?kind=person&type=1&gender=2&sort=collects&page=2',
  );

  assert.equal(response.status, 200);
  assert.equal((await response.json()).items[0].id, 4765);
});

test('public people route rejects incompatible filters', async () => {
  const response = await createApp().request(
    '/public/people?kind=character&type=8&gender=3&page=0',
  );

  assert.equal(response.status, 400);
});
