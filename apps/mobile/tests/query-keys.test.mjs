import assert from 'node:assert/strict';
import test from 'node:test';

import { queryKeys } from '../src/lib/query-keys.ts';

test('static keys stay stable across calls', () => {
  assert.deepEqual(queryKeys.wikiRevisions(), ['wiki', 'kaku', 'revisions']);
  assert.deepEqual(queryKeys.calendar(), ['calendar', 'bangumi']);
  assert.deepEqual(queryKeys.community(), ['community', 'bangumi']);
  assert.deepEqual(queryKeys.communityTopics(), ['community', 'bangumi', 'topics']);
  assert.deepEqual(queryKeys.bangumiStatus(), ['network-status', 'bangumi-status']);
});

test('global feed keys carry the selected filter', () => {
  assert.deepEqual(queryKeys.globalBlogs('anime'), ['blogs', 'kaku', 'anime']);
  assert.deepEqual(queryKeys.globalIndexes('popular'), ['indexes', 'kaku', 'popular']);
  assert.deepEqual(queryKeys.globalTags(1), ['tags', 'kaku', 1]);
  assert.deepEqual(queryKeys.channel(2), ['channel', 'kaku', 2]);
  assert.deepEqual(queryKeys.rankedSubjects(4), ['ranked-subjects', 'bangumi', 4]);
});

test('global people keys fall back to all-types and all-genders placeholders', () => {
  assert.deepEqual(queryKeys.globalPeople('character', 'collects'), [
    'people-browser',
    'kaku',
    'character',
    'collects',
    'all-types',
    'all-genders',
  ]);
  assert.deepEqual(queryKeys.globalPeople('person', 'dateline', 1, 2), [
    'people-browser',
    'kaku',
    'person',
    'dateline',
    1,
    2,
  ]);
});

test('people and subject search keys trim the keyword', () => {
  assert.deepEqual(queryKeys.peopleSearch('character', '  芙莉莲  '), [
    'people-search',
    'bangumi',
    'character',
    '芙莉莲',
  ]);
  assert.deepEqual(queryKeys.subjectSearch('  frieren ', 2), [
    'subject-search',
    'bangumi',
    2,
    'frieren',
  ]);
});

test('signed-in user ids are embedded and signed-out falls back to a placeholder', () => {
  assert.deepEqual(queryKeys.myCollections(7), ['my-collections', 'kaku', 7]);
  assert.deepEqual(queryKeys.myCollectionSearch(7), [
    'my-collections',
    'kaku',
    7,
    'search',
  ]);
  assert.deepEqual(queryKeys.myCollectionBrowse(7, 2, 'doing'), [
    'my-collections',
    'kaku',
    7,
    'browse',
    2,
    'doing',
  ]);
  assert.deepEqual(queryKeys.myCollectionBrowse(undefined, 0), [
    'my-collections',
    'kaku',
    'signed-out',
    'browse',
    0,
    'all',
  ]);
  assert.deepEqual(queryKeys.myCollections(undefined), [
    'my-collections',
    'kaku',
    'signed-out',
  ]);
  assert.deepEqual(queryKeys.personalCollection(7, 42), [
    'collections',
    'kaku',
    7,
    42,
  ]);
  assert.deepEqual(queryKeys.personalCollection(undefined, 42), [
    'collections',
    'kaku',
    'signed-out',
    42,
  ]);
  assert.deepEqual(queryKeys.friendTimeline(3), [
    'timeline',
    'kaku',
    3,
    'friends',
  ]);
  assert.deepEqual(queryKeys.friendTimeline(undefined), [
    'timeline',
    'kaku',
    'signed-out',
    'friends',
  ]);
  assert.deepEqual(queryKeys.notifications(9), [
    'notifications',
    'kaku',
    9,
  ]);
  assert.deepEqual(queryKeys.notifications(undefined), [
    'notifications',
    'kaku',
    'signed-out',
  ]);
  assert.deepEqual(queryKeys.blocklist(undefined), [
    'blocklist',
    'kaku',
    'signed-out',
  ]);
  assert.deepEqual(queryKeys.userFriendship(undefined, 'soul'), [
    'friends',
    'kaku',
    'signed-out',
    'soul',
  ]);
  assert.deepEqual(queryKeys.entityCollection(undefined, 'person', 5), [
    'entity-collections',
    'kaku',
    'signed-out',
    'person',
    5,
  ]);
  assert.deepEqual(queryKeys.indexCollection(12, 88), [
    'indexes',
    'kaku',
    12,
    'collection',
    88,
  ]);
});

test('browse keys default missing year and tag filters to all', () => {
  assert.deepEqual(queryKeys.browseSubjects(2, 'rank'), [
    'browse-v2',
    'kaku',
    2,
    'rank',
    'all',
    'all',
  ]);
  assert.deepEqual(queryKeys.browseSubjects(1, 'date', 2024, '科幻'), [
    'browse-v2',
    'kaku',
    1,
    'date',
    2024,
    '科幻',
  ]);
});

test('catalog and discussion keys keep their namespace hierarchy', () => {
  assert.deepEqual(queryKeys.catalogSubject(9, 3), [
    'catalog-subject',
    'bangumi',
    3,
    9,
  ]);
  assert.deepEqual(queryKeys.subjectTopics(9, 10), [
    'discussions',
    'bangumi',
    'subject',
    9,
    10,
  ]);
  assert.deepEqual(queryKeys.subjectTopic(55), [
    'discussions',
    'bangumi',
    'topic',
    55,
  ]);
  assert.deepEqual(queryKeys.episodeComments(123), [
    'discussions',
    'bangumi',
    'episode',
    123,
  ]);
  // episodeComments is optional-keyed: undefined stays in the key.
  assert.deepEqual(queryKeys.episodeComments(), [
    'discussions',
    'bangumi',
    'episode',
    undefined,
  ]);
});

test('review keys separate comments from long reviews', () => {
  assert.deepEqual(queryKeys.subjectComments(9), [
    'reviews',
    'bangumi',
    'comments',
    9,
  ]);
  assert.deepEqual(queryKeys.subjectReviews(9), [
    'reviews',
    'bangumi',
    'long-reviews',
    9,
  ]);
  assert.deepEqual(queryKeys.subjectReview(77), [
    'reviews',
    'bangumi',
    'long-review',
    77,
  ]);
});

test('subject metadata keys split staff, characters and relations', () => {
  assert.deepEqual(queryKeys.subjectStaff(9), ['subject-staff', 'bangumi', 9]);
  assert.deepEqual(queryKeys.subjectCharacters(9), [
    'subject-characters',
    'bangumi',
    'localized-v2',
    9,
  ]);
  assert.deepEqual(queryKeys.subjectRelations(9), [
    'subject-relations',
    'bangumi',
    9,
  ]);
});

test('people keys distinguish characters from persons and comment kinds', () => {
  assert.deepEqual(queryKeys.character(4), ['people', 'bangumi', 'character', 4]);
  assert.deepEqual(queryKeys.person(5), ['people', 'bangumi', 'person', 5]);
  assert.deepEqual(queryKeys.entityComments('character', 4), [
    'people',
    'bangumi',
    'character',
    4,
    'comments',
  ]);
});

test('public user keys normalize one username across every nested cache', () => {
  assert.deepEqual(queryKeys.publicUser('  Soul '), ['users', 'bangumi', 'soul']);
  assert.deepEqual(queryKeys.publicUserCollections('  Soul ', 2), [
    'users',
    'bangumi',
    'soul',
    'collections',
    2,
    'all',
  ]);
  assert.deepEqual(queryKeys.publicUserCollections('  Soul ', 2, 'doing'), [
    'users',
    'bangumi',
    'soul',
    'collections',
    2,
    'doing',
  ]);
  assert.deepEqual(queryKeys.publicUserBlogs('  Soul '), [
    'users',
    'bangumi',
    'soul',
    'blogs',
  ]);
  assert.deepEqual(queryKeys.publicUserFriends('  Soul '), [
    'users',
    'bangumi',
    'soul',
    'friends',
  ]);
  assert.deepEqual(queryKeys.publicUserTimeline('  Soul '), [
    'users',
    'bangumi',
    'soul',
    'timeline',
  ]);
  assert.deepEqual(queryKeys.publicUserEntities('  Soul ', 'character'), [
    'users',
    'bangumi',
    'soul',
    'entities',
    'character',
  ]);
  assert.deepEqual(queryKeys.userFriendship(7, '  Soul '), [
    'friends',
    'kaku',
    7,
    'soul',
  ]);
});

test('index keys separate the index from its items and subject lists', () => {
  assert.deepEqual(queryKeys.subjectIndexes(9), [
    'indexes',
    'bangumi',
    'subject',
    9,
  ]);
  assert.deepEqual(queryKeys.publicIndex(88), ['indexes', 'bangumi', 88]);
  assert.deepEqual(queryKeys.publicIndexItems(88), [
    'indexes',
    'bangumi',
    88,
    'items',
  ]);
});

test('group keys nest groups under the community namespace', () => {
  assert.deepEqual(queryKeys.group('frieren'), [
    'community',
    'bangumi',
    'group',
    'frieren',
  ]);
  assert.deepEqual(queryKeys.groupTopics('frieren'), [
    'community',
    'bangumi',
    'group',
    'frieren',
    'topics',
  ]);
  assert.deepEqual(queryKeys.groupTopic(55), [
    'community',
    'bangumi',
    'topic',
    55,
  ]);
});
