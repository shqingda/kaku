import {
  bangumiBlogCommentsSchema,
  bangumiBlogSchema,
  bangumiEpisodeCommentsSchema,
  bangumiIndexPageSchema,
  bangumiIndexRelatedSchema,
  bangumiIndexSchema,
  bangumiGroupDetailSchema,
  bangumiGroupPageSchema,
  bangumiGroupTopicPageSchema,
  bangumiGroupTopicSchema,
  bangumiSubjectCommentsSchema,
  bangumiSubjectReviewsSchema,
  bangumiSubjectTopicPageSchema,
  bangumiSubjectTopicSchema,
  bangumiUserBlogsSchema,
  bangumiUserFriendsSchema,
  bangumiUserTimelineSchema,
} from './schemas';
import { createBangumiRequester } from '../transport/http-client';

const requestJson = createBangumiRequester({
  baseUrl: 'https://next.bgm.tv',
  failedMessage: (status) => `Bangumi 讨论请求失败（${status}）`,
  networkMessage: '暂时无法连接 Bangumi 讨论服务',
  timeoutMessage: 'Bangumi 讨论请求超时',
});

export async function getBangumiSubjectTopics(
  subjectId: number,
  limit = 20,
  offset = 0,
) {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const json = await requestJson(`/p1/subjects/${subjectId}/topics?${query}`);
  return bangumiSubjectTopicPageSchema.parse(json);
}

export async function getBangumiSubjectTopic(topicId: number) {
  const json = await requestJson(`/p1/subjects/-/topics/${topicId}`);
  return bangumiSubjectTopicSchema.parse(json);
}

export async function getBangumiEpisodeComments(episodeId: number) {
  const json = await requestJson(`/p1/episodes/${episodeId}/comments`);
  return bangumiEpisodeCommentsSchema.parse(json);
}

export async function getBangumiSubjectComments(
  subjectId: number,
  offset: number,
) {
  const json = await requestJson(
    `/p1/subjects/${subjectId}/comments?limit=30&offset=${offset}`,
  );
  return bangumiSubjectCommentsSchema.parse(json);
}

export async function getBangumiSubjectReviews(
  subjectId: number,
  offset: number,
) {
  const json = await requestJson(
    `/p1/subjects/${subjectId}/reviews?limit=20&offset=${offset}`,
  );
  return bangumiSubjectReviewsSchema.parse(json);
}

export async function getBangumiReview(reviewId: number) {
  const [blogJson, commentsJson] = await Promise.all([
    requestJson(`/p1/blogs/${reviewId}`),
    requestJson(`/p1/blogs/${reviewId}/comments`),
  ]);

  return {
    blog: bangumiBlogSchema.parse(blogJson),
    comments: bangumiBlogCommentsSchema.parse(commentsJson),
  };
}

export async function getBangumiUserBlogs(
  username: string,
  offset = 0,
) {
  const query = new URLSearchParams({
    limit: '10',
    offset: String(offset),
  });
  const json = await requestJson(
    `/p1/users/${encodeURIComponent(username)}/blogs?${query}`,
  );
  return bangumiUserBlogsSchema.parse(json);
}

export async function getBangumiUserSocial(username: string) {
  const encodedUsername = encodeURIComponent(username);
  const [friendsJson, timeline] = await Promise.all([
    requestJson(`/p1/users/${encodedUsername}/friends?limit=20&offset=0`),
    getBangumiUserTimeline(username),
  ]);

  return {
    friends: bangumiUserFriendsSchema.parse(friendsJson),
    timeline,
  };
}

export async function getBangumiUserTimeline(
  username: string,
  until?: number,
  limit = 10,
) {
  const query = new URLSearchParams({ limit: String(limit) });

  if (until !== undefined) {
    query.set('until', String(until));
  }

  const json = await requestJson(
    `/p1/users/${encodeURIComponent(username)}/timeline?${query}`,
  );
  return bangumiUserTimelineSchema.parse(json);
}

export async function getBangumiUserFriends(
  username: string,
  offset: number,
) {
  const query = new URLSearchParams({
    limit: '20',
    offset: String(offset),
  });
  const json = await requestJson(
    `/p1/users/${encodeURIComponent(username)}/friends?${query}`,
  );
  return bangumiUserFriendsSchema.parse(json);
}

export async function getBangumiSubjectIndexes(
  subjectId: number,
  offset: number,
  limit: number,
) {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const json = await requestJson(
    `/p1/subjects/${subjectId}/indexes?${query}`,
  );
  return bangumiIndexPageSchema.parse(json);
}

export async function getBangumiIndex(indexId: number) {
  const json = await requestJson(`/p1/indexes/${indexId}`);
  return bangumiIndexSchema.parse(json);
}

export async function getBangumiIndexRelated(
  indexId: number,
  offset: number,
  limit: number,
) {
  const query = new URLSearchParams({
    cat: '0',
    limit: String(limit),
    offset: String(offset),
    type: '2',
  });
  const json = await requestJson(
    `/p1/indexes/${indexId}/related?${query}`,
  );
  return bangumiIndexRelatedSchema.parse(json);
}

export async function getBangumiCommunity() {
  const [groupsJson, topicsJson] = await Promise.all([
    requestJson('/p1/groups?sort=members&limit=12&offset=0'),
    requestJson('/p1/groups/-/topics?mode=all&limit=30&offset=0'),
  ]);

  return {
    groups: bangumiGroupPageSchema.parse(groupsJson),
    topics: bangumiGroupTopicPageSchema.parse(topicsJson),
  };
}

export async function getBangumiGroup(groupName: string) {
  const encodedName = encodeURIComponent(groupName);
  const json = await requestJson(`/p1/groups/${encodedName}`);
  return bangumiGroupDetailSchema.parse(json);
}

export async function getBangumiGroupTopics(
  groupName: string,
  offset: number,
) {
  const encodedName = encodeURIComponent(groupName);
  const json = await requestJson(
    `/p1/groups/${encodedName}/topics?limit=50&offset=${offset}`,
  );
  return bangumiGroupTopicPageSchema.parse(json);
}

export async function getBangumiGroupTopic(topicId: number) {
  const json = await requestJson(`/p1/groups/-/topics/${topicId}`);
  return bangumiGroupTopicSchema.parse(json);
}
