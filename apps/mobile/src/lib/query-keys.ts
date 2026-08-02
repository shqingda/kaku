export const queryKeys = {
  catalogSubject: (subjectId: number, version: number) =>
    ['catalog-subject', 'bangumi', version, subjectId] as const,
  calendar: () => ['calendar', 'bangumi'] as const,
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
    ['subject-characters', 'bangumi', subjectId] as const,
  subjectRelations: (subjectId: number) =>
    ['subject-relations', 'bangumi', subjectId] as const,
  character: (characterId: number) =>
    ['people', 'bangumi', 'character', characterId] as const,
  person: (personId: number) =>
    ['people', 'bangumi', 'person', personId] as const,
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
