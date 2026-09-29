import assert from 'node:assert/strict';
import test from 'node:test';

import { isEpisodeAired, episodeAiringLabel } from '../src/features/subject-detail/episode-airing.ts';

test('an episode airing today counts as aired from the start of the day', () => {
  assert.equal(isEpisodeAired('2026-08-23', '2026-08-23'), true);
});

test('an already-aired episode counts as aired', () => {
  assert.equal(isEpisodeAired('2026-08-16', '2026-08-23'), true);
});

test('an episode airing tomorrow is not aired yet', () => {
  assert.equal(isEpisodeAired('2026-08-24', '2026-08-23'), false);
});

test('missing or partial air dates are not aired', () => {
  assert.equal(isEpisodeAired(undefined, '2026-08-23'), false);
  assert.equal(isEpisodeAired('', '2026-08-23'), false);
  assert.equal(isEpisodeAired('2026', '2026-08-23'), false);
});


test('invalid dates remain unknown and same-day dates do not promise an elapsed airtime', () => {
  for (const date of ['2026-02-30', '2026-00-00', 'not a date', '0000-00-00']) {
    assert.equal(episodeAiringLabel(date, '2026-08-23'), '时间待定');
    assert.equal(isEpisodeAired(date, '2026-08-23'), false);
  }
  assert.equal(episodeAiringLabel('2026-08-23', '2026-08-23'), '今日放送');
  assert.equal(episodeAiringLabel('2026-08-24', '2026-08-23'), '未放送');
});
