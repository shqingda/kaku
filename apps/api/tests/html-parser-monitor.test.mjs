import assert from 'node:assert/strict';
import test from 'node:test';

import { createHtmlParseFailureLog } from '../src/html-parser-monitor.ts';

test('HTML parser alerts are structured and omit query data', () => {
  const log = createHtmlParseFailureLog({
    page: 1,
    parser: 'tags',
    url: 'https://bgm.tv/anime/tag?keyword=private-value',
  });

  assert.deepEqual(log, {
    event: 'bangumi_html_parse_failure',
    host: 'bgm.tv',
    page: 1,
    parser: 'tags',
    path: '/anime/tag',
  });
  assert.equal(JSON.stringify(log).includes('private-value'), false);
});
