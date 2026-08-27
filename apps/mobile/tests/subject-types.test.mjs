import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getCollectionStatusLabel,
  getSubjectChannelLabel,
  getSubjectDetailLabels,
  getSubjectInfoKeys,
  supportsReadingProgress,
  supportsWatchProgress,
  usesEpisodeData,
} from '../src/features/catalog/subject-types.ts';

test('channel copy calls books 阅读 instead of 书籍', () => {
  assert.equal(getSubjectChannelLabel(1), '阅读');
  assert.equal(getSubjectChannelLabel(2), '动画');
  assert.equal(getSubjectChannelLabel(6), '三次元');
});

test('collection labels follow each Bangumi subject type', () => {
  assert.equal(getCollectionStatusLabel(1, 'doing'), '在读');
  assert.equal(getCollectionStatusLabel(2, 'doing'), '在看');
  assert.equal(getCollectionStatusLabel(3, 'doing'), '在听');
  assert.equal(getCollectionStatusLabel(4, 'doing'), '在玩');
  assert.equal(getCollectionStatusLabel(6, 'doing'), '在看');
});

test('only watchable media exposes watched episode progress', () => {
  assert.equal(supportsWatchProgress(2), true);
  assert.equal(supportsWatchProgress(6), true);
  assert.equal(supportsWatchProgress(3), false);
  assert.equal(supportsReadingProgress(1), true);
  assert.equal(supportsReadingProgress(2), false);
  assert.equal(usesEpisodeData(3), true);
  assert.equal(usesEpisodeData(4), false);
});

test('subject detail labels follow each media type', () => {
  assert.equal(getSubjectDetailLabels(1).credits.label, '作者与创作');
  assert.equal(getSubjectDetailLabels(3).credits.label, '艺术家与制作');
  assert.equal(getSubjectDetailLabels(4).characters.label, '角色与人物');
  assert.equal(getSubjectDetailLabels(6).credits.label, '演职人员');
  assert.equal(getSubjectDetailLabels(3).characters, undefined);
});

test('subject info keeps the metadata relevant to each media type', () => {
  assert.equal(getSubjectInfoKeys(1).includes('ISBN'), true);
  assert.equal(getSubjectInfoKeys(3).includes('碟片数量'), true);
  assert.equal(getSubjectInfoKeys(4).includes('游戏平台'), false);
  assert.equal(getSubjectInfoKeys(4).includes('平台'), true);
  assert.equal(getSubjectInfoKeys(6).includes('国家/地区'), true);
});
