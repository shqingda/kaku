import assert from 'node:assert/strict';
import test from 'node:test';

import { getRatingLabel } from '../src/features/reviews/rating-label.ts';

test('rating labels match the original Bangumi scale', () => {
  assert.equal(getRatingLabel(5), '不过不失');
  assert.equal(getRatingLabel(8), '力荐');
  assert.equal(getRatingLabel(9), '神作');
  assert.equal(getRatingLabel(10), '超神作');
});
