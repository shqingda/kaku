import assert from 'node:assert/strict';
import test from 'node:test';

import { parseBangumiBlogPage } from '../src/blogs/bangumi-client.ts';
import { parseBangumiIndexPage } from '../src/indexes/bangumi-client.ts';
import { parseBangumiPeoplePage } from '../src/people-browser/bangumi-client.ts';
import { parseBangumiTagPage } from '../src/tags/bangumi-client.ts';
import { parseBangumiWikiFeed } from '../src/wiki/bangumi-client.ts';

test('HTML parsers return empty public models instead of throwing on blank pages', () => {
  assert.deepEqual(parseBangumiBlogPage('', 1).items, []);
  assert.equal(parseBangumiBlogPage('', 1).nextPage, undefined);

  assert.deepEqual(parseBangumiIndexPage('', 1).items, []);
  assert.equal(parseBangumiIndexPage('', 1).nextPage, undefined);

  assert.deepEqual(parseBangumiPeoplePage('', 1).items, []);
  assert.equal(parseBangumiPeoplePage('', 1).nextPage, undefined);

  assert.deepEqual(parseBangumiTagPage('', 1).items, []);
  assert.equal(parseBangumiTagPage('', 1).nextPage, undefined);

  assert.deepEqual(parseBangumiWikiFeed('').items, []);
});

test('HTML parsers ignore unrelated markup', () => {
  const decoy = '<html><body><div id="wrapper">Kaku</div></body></html>';

  assert.equal(parseBangumiBlogPage(decoy, 1).items.length, 0);
  assert.equal(parseBangumiIndexPage(decoy, 1).items.length, 0);
  assert.equal(parseBangumiPeoplePage(decoy, 1).items.length, 0);
  assert.equal(parseBangumiTagPage(decoy, 1).items.length, 0);
  assert.equal(parseBangumiWikiFeed(decoy).items.length, 0);
});
