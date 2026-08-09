import assert from 'node:assert/strict';
import test from 'node:test';

import { parsePositiveIntegerRouteParam } from '../src/lib/route-params.ts';

test('route params accept only positive safe integers', () => {
  assert.equal(parsePositiveIntegerRouteParam('400602'), 400602);
  assert.equal(parsePositiveIntegerRouteParam('1'), 1);
  assert.equal(parsePositiveIntegerRouteParam('0'), undefined);
  assert.equal(parsePositiveIntegerRouteParam('-1'), undefined);
  assert.equal(parsePositiveIntegerRouteParam('1.5'), undefined);
  assert.equal(parsePositiveIntegerRouteParam('not-a-number'), undefined);
  assert.equal(parsePositiveIntegerRouteParam('9007199254740992'), undefined);
  assert.equal(parsePositiveIntegerRouteParam(), undefined);
});
