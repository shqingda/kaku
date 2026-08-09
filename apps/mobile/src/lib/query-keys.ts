export const queryKeys = {
  wikiRevisions: () => ['wiki', 'kaku', 'revisions'] as const,
  globalBlogs: (type: string) => ['blogs', 'kaku', type] as const,
  globalIndexes: (sort: string) => ['indexes', 'kaku', sort] as const,
  globalTags: (subjectType: number) =>
    ['tags', 'kaku', subjectType] as const,
  globalPeople: (
    kind: string,
    sort: string,
    type?: number,
    gender?: number,
  ) => [
    'people-browser',
    'kaku',
    kind,
    sort,
    type ?? 'all-types',
    gender ?? 'all-genders',
  ] as const,
  peopleSearch: (kind: string, keyword: string) =>
    ['people-search', 'bangumi', kind, keyword.trim()] as const,
  personalCollection: (userId: number | undefined, subjectId: number) =>
    ['collections', 'kaku', userId ?? 'signed-out', subjectId] as const,
  friendTimeline: (userId: number | undefined) =>
    ['timeline', 'kaku', userId ?? 'signed-out', 'friends'] as const,
  notifications: (userId: number | undefined) =>
    ['notifications', 'kaku', userId ?? 'signed-out'] as const,
  catalogSubject: (subjectId: number, version: number) =>
    ['catalog-subject', 'bangumi', version, subjectId] as const,
  calendar: () => ['calendar', 'bangumi'] as const,
  channel: (subjectType: number) =>
    ['channel', 'kaku', subjectType] as const,
  browseSubjects: (
    subjectType: number,
    sort: string,
    year?: number,
    tag?: string,
  ) => ['browse-v2', 'kaku', subjectType, sort, year ?? 'all', tag ?? 'all'] as const,
  rankedSubjects: (subjectType: number) =>
    ['ranked-subjects', 'bangumi', subjectType] as const,
  subjectSearch: (keyword: string, subjectType: number) =>
    ['subject-search', 'bangumi', subjectType, keyword.trim()] as const,
  subjectTopics: (subjectId: number, limit: number) =>
    ['discussions', 'bangumi', 'subject', subjectId, limit] as const,
  subjectTopic: (topicId: number) =>
    ['discussions', 'bangumi', 'topic', topicId] as const,
  episodeComments: (episodeId?: number) =>
    ['discussions', 'bangumi', 'episode', episodeId] as const,
  subjectComments: (subjectId: number) =>
    ['reviews', 'bangumi', 'comments', subjectId] as const,
  subjectReviews: (subjectId: number) =>
    ['reviews', 'bangumi', 'long-reviews', subjectId] as const,
  subjectReview: (reviewId: number) =>
    ['reviews', 'bangumi', 'long-review', reviewId] as const,
  subjectStaff: (subjectId: number) =>
    ['subject-staff', 'bangumi', subjectId] as const,
  subjectCharacters: (subjectId: number) =>
    ['subject-characters', 'bangumi', 'localized-v2', subjectId] as const,
  subjectRelations: (subjectId: number) =>
    ['subject-relations', 'bangumi', subjectId] as const,
  character: (characterId: number) =>
    ['people', 'bangumi', 'character', characterId] as const,
  person: (personId: number) =>
    ['people', 'bangumi', 'person', personId] as const,
  entityCollection: (
    userId: number | undefined,
    kind: string,
    entityId: number,
  ) =>
    [
      'entity-collections',
      'kaku',
      userId ?? 'signed-out',
      kind,
      entityId,
    ] as const,
  publicUser: (username: string) =>
    ['users', 'bangumi', username] as const,
  publicUserCollections: (
    username: string,
    subjectType: number,
    collectionStatus?: string,
  ) =>
    [
      'users',
      'bangumi',
      username,
      'collections',
      subjectType,
      collectionStatus ?? 'all',
    ] as const,
  publicUserBlogs: (username: string) =>
    ['users', 'bangumi', username, 'blogs'] as const,
  publicUserFriends: (username: string) =>
    ['users', 'bangumi', username, 'friends'] as const,
  publicUserEntities: (username: string, kind: string) =>
    ['users', 'bangumi', username, 'entities', kind] as const,
  publicUserTimeline: (username: string) =>
    ['users', 'bangumi', username, 'timeline'] as const,
  subjectIndexes: (subjectId: number) =>
    ['indexes', 'bangumi', 'subject', subjectId] as const,
  publicIndex: (indexId: number) =>
    ['indexes', 'bangumi', indexId] as const,
  publicIndexItems: (indexId: number) =>
    ['indexes', 'bangumi', indexId, 'items'] as const,
  community: () => ['community', 'bangumi'] as const,
  communityTopics: () =>
    ['community', 'bangumi', 'topics'] as const,
  group: (groupName: string) =>
    ['community', 'bangumi', 'group', groupName] as const,
  groupTopics: (groupName: string) =>
    ['community', 'bangumi', 'group', groupName, 'topics'] as const,
  groupTopic: (topicId: number) =>
    ['community', 'bangumi', 'topic', topicId] as const,
};
