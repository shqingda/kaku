import assert from 'node:assert/strict';
import test from 'node:test';

import { getRatingLabel } from '../src/features/reviews/rating-label.ts';

test('out-of-scale ratings fall back to a plain score', () => {
  assert.equal(getRatingLabel(0), '0 分');
  assert.equal(getRatingLabel(11), '11 分');
  assert.equal(getRatingLabel(-3), '-3 分');
});

test('in-scale ratings always use the Bangumi label', () => {
  assert.equal(getRatingLabel(1), '不忍直视');
  assert.equal(getRatingLabel(10), '超神作');
});
