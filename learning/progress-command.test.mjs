import assert from 'node:assert/strict';
import test from 'node:test';

import { applyProgressCommand } from '../apps/mobile/src/features/watching/apply-progress-command.ts';

const initial = {
  totalEpisodes: 12,
  updatedAt: 100,
  watchedCount: 3,
};

test('applies a newer progress command', () => {
  assert.deepEqual(
    applyProgressCommand(initial, {
      id: 'command-1',
      updatedAt: 200,
      watchedCount: 7,
    }),
    {
      lastCommandId: 'command-1',
      totalEpisodes: 12,
      updatedAt: 200,
      watchedCount: 7,
    },
  );
});

test('clamps progress to the valid episode range', () => {
  assert.equal(
    applyProgressCommand(initial, {
      id: 'command-2',
      updatedAt: 200,
      watchedCount: 99,
    }).watchedCount,
    12,
  );

  assert.equal(
    applyProgressCommand(initial, {
      id: 'command-3',
      updatedAt: 200,
      watchedCount: -4,
    }).watchedCount,
    0,
  );
});

test('ignores an older command', () => {
  const result = applyProgressCommand(initial, {
    id: 'stale-command',
    updatedAt: 99,
    watchedCount: 10,
  });

  assert.strictEqual(result, initial);
});

test('applying the same command twice is idempotent', () => {
  const command = {
    id: 'command-4',
    updatedAt: 200,
    watchedCount: 8,
  };
  const once = applyProgressCommand(initial, command);
  const twice = applyProgressCommand(once, command);

  assert.deepEqual(twice, once);
  assert.strictEqual(twice, once);
});

test('does not mutate its inputs', () => {
  const current = { ...initial };
  const command = {
    id: 'command-5',
    updatedAt: 200,
    watchedCount: 6,
  };
  const currentBefore = structuredClone(current);
  const commandBefore = structuredClone(command);

  applyProgressCommand(current, command);

  assert.deepEqual(current, currentBefore);
  assert.deepEqual(command, commandBefore);
});
