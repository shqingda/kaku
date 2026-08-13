import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DECELERATION_RATE,
  DISMISS_HEIGHT_RATIO,
  MAX_IMAGE_SCALE,
  MIN_DISMISS_VELOCITY,
  MIN_IMAGE_SCALE,
  RUBBERBAND_CONSTANT,
  containedTranslation,
  project,
  resistedScale,
  rubberband,
  settleScale,
  shouldDismissSheet,
} from '../src/lib/motion.ts';

test('projection turns velocity into the remaining glide distance', () => {
  assert.equal(project(0), 0);
  assert.equal(project(1000), (1000 / 1000) * (0.998 / (1 - 0.998)));
  assert.ok(project(1000) > project(100));
  assert.equal(project(-500), -project(500));
});

test('projection uses the Apple exponential-decay model, not v²/2a', () => {
  const decayed = project(1000, DECELERATION_RATE);
  assert.ok(Math.abs(decayed - 499) < 1e-9);
});

test('rubberband follows a constant ratio for small overshoot and resists progressively', () => {
  assert.equal(rubberband(0, 300), 0);
  const nearOneToOne = rubberband(1, 300);
  assert.ok(Math.abs(nearOneToOne - RUBBERBAND_CONSTANT) < 2e-3);
  const small = rubberband(10, 300);
  const large = rubberband(200, 300);
  assert.ok(large > small, '继续抵抗但仍在增长');
  assert.ok(large < 200, '越界越远，跟随比例越低');
  assert.ok(rubberband(10000, 300) < 300, '渐进逼近边界距离上限');
});

test('rubberband is symmetric for overshoot direction', () => {
  assert.equal(rubberband(-80, 300), -rubberband(80, 300));
});

test('release far enough below open position dismisses without velocity', () => {
  const dismissDistance = 350;
  assert.equal(shouldDismissSheet(351, 0, dismissDistance), true);
  assert.equal(shouldDismissSheet(349, 0, dismissDistance), false);
});

test('momentum projection lets a fast release dismiss from close range', () => {
  const dismissDistance = 350;
  assert.equal(shouldDismissSheet(200, 900, dismissDistance), true);
  assert.equal(shouldDismissSheet(200, 100, dismissDistance), false);
});

test('a hard flick dismisses even when the projection alone would not', () => {
  const tallDismissDistance = 1200;
  assert.equal(
    shouldDismissSheet(10, MIN_DISMISS_VELOCITY + 1, tallDismissDistance),
    true,
  );
  assert.equal(
    shouldDismissSheet(10, MIN_DISMISS_VELOCITY - 100, tallDismissDistance),
    false,
  );
});

test('dismiss threshold is a ratio of the sheet height', () => {
  assert.equal(DISMISS_HEIGHT_RATIO, 0.35);
});

test('image scale stays 1:1 inside the supported range', () => {
  assert.equal(resistedScale(1), 1);
  assert.equal(resistedScale(2.5), 2.5);
  assert.equal(resistedScale(4), 4);
});

test('image scale resists progressively beyond the limits', () => {
  const above = resistedScale(5);
  assert.ok(above > 4 && above < 5, '超出 4x 时仍继续增长');
  assert.ok(resistedScale(6) - 4 < 2 * (above - 4), '越界越远，增幅越小');
  const below = resistedScale(0.5);
  assert.ok(below < 1 && below > 0.5, '低于 1x 时逐渐抵抗');
});

test('released scale settles to the nearest valid boundary', () => {
  assert.equal(settleScale(0.4), MIN_IMAGE_SCALE);
  assert.equal(settleScale(2.5), 2.5);
  assert.equal(settleScale(9), MAX_IMAGE_SCALE);
});

test('zoom panning is contained so the image never shows empty space', () => {
  const contentSize = 300;
  const viewportSize = 300;
  assert.equal(containedTranslation(10, contentSize, viewportSize, 1), 0);
  const maxOffset = (300 * 2 - 300) / 2;
  assert.equal(containedTranslation(999, contentSize, viewportSize, 2), maxOffset);
  assert.equal(containedTranslation(-999, contentSize, viewportSize, 2), -maxOffset);
  assert.equal(containedTranslation(maxOffset / 2, contentSize, viewportSize, 2), maxOffset / 2);
});
