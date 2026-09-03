import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';
import { BANGUMI_USER_AGENT } from '../src/bangumi-request.ts';
import {
  BangumiBlogListError,
  getBangumiBlogs,
  parseBangumiBlogPage,
} from '../src/blogs/bangumi-client.ts';
import {
  BangumiPeopleListError,
  getBangumiPeople,
  parseBangumiPeoplePage,
} from '../src/people-browser/bangumi-client.ts';
import {
  BangumiTagListError,
  getBangumiTags,
} from '../src/tags/bangumi-client.ts';

const BLOG_HTML = `
  <div id="entry_list">
    <div class="item clearit">
      <p class="cover"><img src="http://lain.bgm.tv/pic/cover/l/blog.jpg" /></p>
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

const TAG_HTML = `
  <div id="tagList">
    <a href="/anime/tag/科幻" class="l level3">科幻</a><small class="grey">(1234)</small>
  </div>
  <hr class="board" />
  <span class="p_edge">(&nbsp;1&nbsp;/&nbsp;9&nbsp;)</span>
`;

const PEOPLE_HTML = `
  <div class="browserCrtList">
    <div id="item_person120">
      <a href="/person/120" class="l">根路径封面</a>
      <img src="/img/person/120.jpg" />
    </div>
    <div id="item_character456">
      <a href="/character/456" class="l">HTTP 封面</a>
      <img src="http://lain.bgm.tv/pic/crt/456.jpg" />
    </div>
  </div>
  <div id="multipage"><span class="p_edge">(&nbsp;1&nbsp;/&nbsp;4&nbsp;)</span></div>
`;

function stubConsoleError(t) {
  const logs = [];
  const original = console.error;
  console.error = (message) => logs.push(message);
  t.after(() => {
    console.error = original;
  });
  return logs;
}

function htmlResponse(html, extraHeaders = {}) {
  return new Response(html, {
    headers: { 'Content-Type': 'text/html', ...extraHeaders },
  });
}

function expectBangumiListError(ErrorClass, status, messagePattern) {
  return (error) => {
    assert.ok(error instanceof ErrorClass);
    assert.equal(error.name, ErrorClass.name);
    assert.equal(error.status, status);
    assert.match(error.message, messagePattern);
    return true;
  };
}

test('blogs client builds the page URL with kaku headers', async () => {
  const calls = [];
  const fetcher = async (input, init) => {
    calls.push({ init, url: String(input) });
    return htmlResponse(BLOG_HTML);
  };

  const page = await getBangumiBlogs({ fetcher, page: 3, type: 'book' });

  assert.equal(calls[0].url, 'https://bgm.tv/book/blog/3.html');
  assert.equal(calls[0].init.headers.Accept, 'text/html');
  assert.equal(calls[0].init.headers['User-Agent'], BANGUMI_USER_AGENT);
  assert.equal(page.page, 3);
  assert.equal(page.totalPages, 3);
  assert.equal(page.nextPage, undefined);
});

test('blogs client uses the first page path without a page suffix', async () => {
  const calls = [];
  const fetcher = async (input, init) => {
    calls.push({ init, url: String(input) });
    return htmlResponse(BLOG_HTML);
  };

  await getBangumiBlogs({ fetcher, page: 1, type: 'all' });

  assert.equal(calls[0].url, 'https://bgm.tv/blog');
});

test('blogs client falls back to global fetch when no fetcher is injected', async (t) => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    calls.push({ init, url: String(input) });
    return htmlResponse(BLOG_HTML);
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const page = await getBangumiBlogs({ page: 1, type: 'anime' });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://bgm.tv/anime/blog');
  assert.equal(page.items[0].id, 378257);
});

test('blogs client maps upstream non-ok responses to a typed error', async () => {
  const fetcher = async () => new Response('nope', { status: 503 });

  await assert.rejects(
    getBangumiBlogs({ fetcher, page: 1, type: 'all' }),
    expectBangumiListError(BangumiBlogListError, 503, /503/),
  );
});

test('blogs client rejects pages that declare a huge Content-Length', async () => {
  const fetcher = async () =>
    htmlResponse('tiny', { 'Content-Length': '1000001' });

  await assert.rejects(
    getBangumiBlogs({ fetcher, page: 1, type: 'all' }),
    expectBangumiListError(BangumiBlogListError, 502, /页面过大/),
  );
});

test('blogs client rejects pages whose body exceeds the size limit', async () => {
  const fetcher = async () => htmlResponse('x'.repeat(1_000_001));

  await assert.rejects(
    getBangumiBlogs({ fetcher, page: 1, type: 'all' }),
    expectBangumiListError(BangumiBlogListError, 502, /页面过大/),
  );
});

test('blogs client reports and fails when page one no longer parses', async (t) => {
  const logs = stubConsoleError(t);
  const fetcher = async () => htmlResponse('<html><body>改版了</body></html>');

  await assert.rejects(
    getBangumiBlogs({ fetcher, page: 1, type: 'all' }),
    expectBangumiListError(BangumiBlogListError, 502, /结构已变化/),
  );

  assert.equal(logs.length, 1);
  assert.deepEqual(JSON.parse(logs[0]), {
    event: 'bangumi_html_parse_failure',
    host: 'bgm.tv',
    page: 1,
    parser: 'blogs',
    path: '/blog',
  });
});

test('blog parser upgrades insecure cover image urls', () => {
  const page = parseBangumiBlogPage(BLOG_HTML, 1);

  assert.equal(page.items[0].coverUrl, 'https://lain.bgm.tv/pic/cover/l/blog.jpg');
});

test('blogs route rejects invalid type or page before fetching', async () => {
  const app = createApp({
    fetcher: async () => {
      throw new Error('upstream should not be called');
    },
  });

  for (const query of [
    'type=movie',
    'type=anime&page=0',
    'type=anime&page=1000',
    'type=anime&page=abc',
  ]) {
    const response = await app.request(`/public/blogs?${query}`);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: 'invalid_blog_query',
      message: '日志类型或页码无效。',
    });
  }
});

test('blogs route maps typed errors to 503 for 5xx and 502 otherwise', async (t) => {
  stubConsoleError(t);

  const upstream500 = await createApp({
    fetcher: async () => new Response('nope', { status: 500 }),
  }).request('/public/blogs?type=all');
  assert.equal(upstream500.status, 503);
  const unavailable = await upstream500.json();
  assert.equal(unavailable.error, 'bangumi_blogs_unavailable');
  assert.match(unavailable.message, /500/);

  const upstream404 = await createApp({
    fetcher: async () => new Response('nope', { status: 404 }),
  }).request('/public/blogs?type=all');
  assert.equal(upstream404.status, 502);
  assert.equal((await upstream404.json()).error, 'bangumi_blogs_unavailable');

  const parseFailure = await createApp({
    fetcher: async () => htmlResponse('<html></html>'),
  }).request('/public/blogs?type=all');
  assert.equal(parseFailure.status, 503);
  assert.match((await parseFailure.json()).message, /结构已变化/);
});

test('tags client builds the subject page url with an abort signal', async () => {
  const calls = [];
  const fetcher = async (input, init) => {
    calls.push({ init, url: String(input) });
    return htmlResponse(TAG_HTML);
  };

  const page = await getBangumiTags({ fetcher, page: 1, subjectType: 2 });

  assert.equal(calls[0].url, 'https://bgm.tv/anime/tag');
  assert.equal(calls[0].init.headers['User-Agent'], BANGUMI_USER_AGENT);
  assert.ok(calls[0].init.signal instanceof AbortSignal);
  assert.equal(calls[0].init.signal.aborted, false);
  assert.deepEqual(page.items, [{ count: 1234, name: '科幻' }]);
  assert.equal(page.nextPage, 2);
});

test('tags client paginates through the subject slug query', async () => {
  const calls = [];
  const fetcher = async (input, init) => {
    calls.push({ init, url: String(input) });
    return htmlResponse(TAG_HTML);
  };

  await getBangumiTags({ fetcher, page: 4, subjectType: 1 });

  assert.equal(calls[0].url, 'https://bgm.tv/book/tag?page=4');
});

test('tags client maps upstream non-ok responses to a typed error', async () => {
  const fetcher = async () => new Response('nope', { status: 429 });

  await assert.rejects(
    getBangumiTags({ fetcher, page: 1, subjectType: 2 }),
    expectBangumiListError(BangumiTagListError, 429, /429/),
  );
});

test('tags client rejects pages that declare a huge Content-Length', async () => {
  const fetcher = async () =>
    htmlResponse('tiny', { 'Content-Length': '1000001' });

  await assert.rejects(
    getBangumiTags({ fetcher, page: 1, subjectType: 2 }),
    expectBangumiListError(BangumiTagListError, 502, /页面过大/),
  );
});

test('tags client cancels the stream once the body exceeds the byte budget', async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(1_100_000));
    },
    cancel() {
      cancelled = true;
    },
  });
  const fetcher = async () => new Response(stream);

  await assert.rejects(
    getBangumiTags({ fetcher, page: 1, subjectType: 2 }),
    expectBangumiListError(BangumiTagListError, 502, /页面过大/),
  );
  assert.equal(cancelled, true);
});

test('tags client reports and fails when page one no longer parses', async (t) => {
  const logs = stubConsoleError(t);
  const fetcher = async () => htmlResponse('<html><body>改版了</body></html>');

  await assert.rejects(
    getBangumiTags({ fetcher, page: 1, subjectType: 2 }),
    expectBangumiListError(BangumiTagListError, 502, /结构已变化/),
  );

  assert.equal(logs.length, 1);
  const entry = JSON.parse(logs[0]);
  assert.equal(entry.event, 'bangumi_html_parse_failure');
  assert.equal(entry.parser, 'tags');
  assert.equal(entry.path, '/anime/tag');
});

test('tags route maps typed errors to 503 for 5xx and 502 otherwise', async (t) => {
  stubConsoleError(t);

  const upstream500 = await createApp({
    fetcher: async () => new Response('nope', { status: 502 }),
  }).request('/public/tags?type=2');
  assert.equal(upstream500.status, 503);
  const unavailable = await upstream500.json();
  assert.equal(unavailable.error, 'bangumi_tags_unavailable');
  assert.match(unavailable.message, /502/);

  const upstream403 = await createApp({
    fetcher: async () => new Response('nope', { status: 403 }),
  }).request('/public/tags?type=2');
  assert.equal(upstream403.status, 502);
  assert.equal((await upstream403.json()).error, 'bangumi_tags_unavailable');
});

test('people client builds the filtered url with an abort signal', async () => {
  const calls = [];
  const fetcher = async (input, init) => {
    calls.push({ init, url: String(input) });
    return htmlResponse(PEOPLE_HTML);
  };

  const page = await getBangumiPeople({
    fetcher,
    gender: 1,
    kind: 'person',
    page: 2,
    sort: 'collects',
    type: 3,
  });

  assert.equal(calls[0].url, 'https://bgm.tv/person?type=3&gender=1&orderby=collects&page=2');
  assert.equal(calls[0].init.headers['User-Agent'], BANGUMI_USER_AGENT);
  assert.ok(calls[0].init.signal instanceof AbortSignal);
  assert.equal(calls[0].init.signal.aborted, false);
  assert.equal(page.page, 2);
  assert.equal(page.nextPage, 3);
});

test('people parser resolves root-relative and insecure image urls', () => {
  const page = parseBangumiPeoplePage(PEOPLE_HTML, 1);

  assert.deepEqual(
    page.items.map((item) => item.imageUrl),
    ['https://bgm.tv/img/person/120.jpg', 'https://lain.bgm.tv/pic/crt/456.jpg'],
  );
});

test('people client maps upstream non-ok responses to a typed error', async () => {
  const fetcher = async () => new Response('nope', { status: 500 });

  await assert.rejects(
    getBangumiPeople({ fetcher, kind: 'character', page: 1, sort: 'dateline' }),
    expectBangumiListError(BangumiPeopleListError, 500, /500/),
  );
});

test('people client rejects pages that declare a huge Content-Length', async () => {
  const fetcher = async () =>
    htmlResponse('tiny', { 'Content-Length': '1000001' });

  await assert.rejects(
    getBangumiPeople({ fetcher, kind: 'character', page: 1, sort: 'dateline' }),
    expectBangumiListError(BangumiPeopleListError, 502, /页面过大/),
  );
});

test('people client cancels the stream once the body exceeds the byte budget', async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(1_100_000));
    },
    cancel() {
      cancelled = true;
    },
  });
  const fetcher = async () => new Response(stream);

  await assert.rejects(
    getBangumiPeople({ fetcher, kind: 'character', page: 1, sort: 'dateline' }),
    expectBangumiListError(BangumiPeopleListError, 502, /页面过大/),
  );
  assert.equal(cancelled, true);
});

test('people client reports and fails when page one no longer parses', async (t) => {
  const logs = stubConsoleError(t);
  const fetcher = async () => htmlResponse('<html><body>改版了</body></html>');

  await assert.rejects(
    getBangumiPeople({ fetcher, kind: 'character', page: 1, sort: 'dateline' }),
    expectBangumiListError(BangumiPeopleListError, 502, /结构已变化/),
  );

  assert.equal(logs.length, 1);
  const entry = JSON.parse(logs[0]);
  assert.equal(entry.event, 'bangumi_html_parse_failure');
  assert.equal(entry.parser, 'people');
  assert.equal(entry.path, '/character');
});

test('people route maps typed errors to 503 for 5xx and 502 otherwise', async (t) => {
  stubConsoleError(t);

  const upstream500 = await createApp({
    fetcher: async () => new Response('nope', { status: 500 }),
  }).request('/public/people?kind=person');
  assert.equal(upstream500.status, 503);
  const unavailable = await upstream500.json();
  assert.equal(unavailable.error, 'bangumi_people_unavailable');
  assert.match(unavailable.message, /500/);

  const parseFailure = await createApp({
    fetcher: async () => htmlResponse('<html></html>'),
  }).request('/public/people?kind=person');
  assert.equal(parseFailure.status, 503);
  assert.match((await parseFailure.json()).message, /结构已变化/);
});
