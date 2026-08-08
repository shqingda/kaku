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
  bangumiSubjectCharacterNamesSchema,
  bangumiSubjectReviewsSchema,
  bangumiSubjectTopicPageSchema,
  bangumiSubjectTopicSchema,
  bangumiUserBlogsSchema,
  bangumiUserFriendsSchema,
  bangumiUserTimelineSchema,
} from './schemas';
import type { BangumiSubjectCharacterName } from './schemas';
import { createBangumiRequester } from '../transport/http-client';
import { getRemainingPageOffsets } from '../subject-extras/pagination';

const requestJson = createBangumiRequester({
  baseUrl: 'https://next.bgm.tv',
  failedMessage: (status) => `Bangumi 数据请求失败（${status}）`,
  networkMessage: '暂时无法连接 Bangumi 数据服务',
  timeoutMessage: 'Bangumi 数据请求超时',
});

const CHARACTER_PAGE_SIZE = 100;

async function getBangumiSubjectCharacterNamePage(
  subjectId: number,
  offset: number,
  signal?: AbortSignal,
) {
  const json = await requestJson(
    `/p1/subjects/${subjectId}/characters?limit=${CHARACTER_PAGE_SIZE}&offset=${offset}`,
    { signal },
  );
  return bangumiSubjectCharacterNamesSchema.parse(json);
}

export async function getBangumiSubjectCharacterNames(
  subjectId: number,
  signal?: AbortSignal,
): Promise<BangumiSubjectCharacterName[]> {
  const firstPage = await getBangumiSubjectCharacterNamePage(
    subjectId,
    0,
    signal,
  );
  const remainingOffsets = getRemainingPageOffsets(
    firstPage.total,
    CHARACTER_PAGE_SIZE,
  );
  const remainingPages = await Promise.all(
    remainingOffsets.map((offset) =>
      getBangumiSubjectCharacterNamePage(subjectId, offset, signal),
    ),
  );

  return [firstPage, ...remainingPages].flatMap((page) =>
    page.data.map((item) => item.character),
  );
}

export async function getBangumiSubjectTopics(
  subjectId: number,
  limit = 20,
  offset = 0,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const json = await requestJson(`/p1/subjects/${subjectId}/topics?${query}`, {
    signal,
  });
  return bangumiSubjectTopicPageSchema.parse(json);
}

export async function getBangumiSubjectTopic(
  topicId: number,
  signal?: AbortSignal,
) {
  const json = await requestJson(`/p1/subjects/-/topics/${topicId}`, {
    signal,
  });
  return bangumiSubjectTopicSchema.parse(json);
}

export async function getBangumiEpisodeComments(
  episodeId: number,
  signal?: AbortSignal,
) {
  const json = await requestJson(`/p1/episodes/${episodeId}/comments`, {
    signal,
  });
  return bangumiEpisodeCommentsSchema.parse(json);
}

export async function getBangumiSubjectComments(
  subjectId: number,
  offset: number,
  signal?: AbortSignal,
) {
  const json = await requestJson(
    `/p1/subjects/${subjectId}/comments?limit=30&offset=${offset}`,
    { signal },
  );
  return bangumiSubjectCommentsSchema.parse(json);
}

export async function getBangumiSubjectReviews(
  subjectId: number,
  offset: number,
  signal?: AbortSignal,
) {
  const json = await requestJson(
    `/p1/subjects/${subjectId}/reviews?limit=20&offset=${offset}`,
    { signal },
  );
  return bangumiSubjectReviewsSchema.parse(json);
}

export async function getBangumiReview(
  reviewId: number,
  signal?: AbortSignal,
) {
  const [blogJson, commentsJson] = await Promise.all([
    requestJson(`/p1/blogs/${reviewId}`, { signal }),
    requestJson(`/p1/blogs/${reviewId}/comments`, { signal }),
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
  });
  const json = await requestJson(
    `/p1/indexes/${indexId}/related?${query}`,
  );
  return bangumiIndexRelatedSchema.parse(json);
}

export async function getBangumiCommunity() {
  const json = await requestJson(
    '/p1/groups?sort=members&limit=12&offset=0',
  );
  return bangumiGroupPageSchema.parse(json);
}

export async function getBangumiCommunityTopics(
  offset: number,
  limit: number,
) {
  const json = await requestJson(
    `/p1/groups/-/topics?mode=all&limit=${limit}&offset=${offset}`,
  );
  return bangumiGroupTopicPageSchema.parse(json);
}

export async function getBangumiGroup(groupName: string) {
  const encodedName = encodeURIComponent(groupName);
  const json = await requestJson(`/p1/groups/${encodedName}`);
  return bangumiGroupDetailSchema.parse(json);
}

export async function getBangumiGroupTopics(
  groupName: string,
  offset: number,
  limit: number,
) {
  const encodedName = encodeURIComponent(groupName);
  const json = await requestJson(
    `/p1/groups/${encodedName}/topics?limit=${limit}&offset=${offset}`,
  );
  return bangumiGroupTopicPageSchema.parse(json);
}

export async function getBangumiGroupTopic(topicId: number) {
  const json = await requestJson(`/p1/groups/-/topics/${topicId}`);
  return bangumiGroupTopicSchema.parse(json);
}
