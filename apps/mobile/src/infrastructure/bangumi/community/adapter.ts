import type {
  PublicGroup,
  PublicGroupTopicPage,
  PublicGroupTopicSummary,
} from '../../../features/community/model.ts';
import type {
  BangumiGroupPage,
  BangumiGroupTopicPage,
} from '../api-next/schemas.ts';

export function toPublicGroup(
  group: BangumiGroupPage['data'][number],
): PublicGroup {
  return {
    iconUrl: group.icon.medium || group.icon.small,
    memberCount: group.members,
    name: group.name,
    title: group.title,
  };
}

export function toPublicGroupTopic(
  topic: BangumiGroupTopicPage['data'][number],
): PublicGroupTopicSummary {
  return {
    author:
      topic.creator?.nickname ||
      topic.creator?.username ||
      `用户 ${topic.creatorID}`,
    authorAvatarUrl:
      topic.creator?.avatar?.medium || topic.creator?.avatar?.small,
    authorUsername: topic.creator?.username,
    groupName: topic.group?.name,
    groupTitle: topic.group?.title,
    id: topic.id,
    replyCount: topic.replyCount,
    title: topic.title,
    updatedAt: topic.updatedAt,
  };
}

export function toPublicGroupTopicPage(
  response: BangumiGroupTopicPage,
  offset: number,
  limit: number,
  group?: Pick<PublicGroup, 'name' | 'title'>,
): PublicGroupTopicPage {
  const nextOffset = limit + offset;

  return {
    items: response.data.map((topic) => ({
      ...toPublicGroupTopic(topic),
      groupName: group?.name ?? topic.group?.name,
      groupTitle: group?.title ?? topic.group?.title,
    })),
    nextOffset:
      response.data.length > 0 && nextOffset < response.total
        ? nextOffset
        : undefined,
    total: response.total,
  };
}
