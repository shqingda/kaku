import type {
  PublicCommunity,
  PublicGroupDetail,
  PublicGroupTopic,
  PublicGroupTopicPage,
} from '@/features/community/model';
import { mapBangumiReplies } from '../discussions/adapter';

import {
  toPublicGroup,
  toPublicGroupTopic,
  toPublicGroupTopicPage,
} from './adapter';
import {
  getBangumiCommunity,
  getBangumiCommunityTopics,
  getBangumiGroup,
  getBangumiGroupTopic,
  getBangumiGroupTopics,
} from '../api-next/client';
import { BangumiRequestError } from '../transport/http-client';

export async function getPublicCommunity(
  signal?: AbortSignal,
): Promise<PublicCommunity> {
  const groups = await getBangumiCommunity(signal);

  return {
    groups: groups.data
      .filter((group) => !group.nsfw)
      .map(toPublicGroup),
  };
}

export async function getPublicCommunityTopics(
  offset: number,
  signal?: AbortSignal,
): Promise<PublicGroupTopicPage> {
  const limit = 30;
  const topics = await getBangumiCommunityTopics(offset, limit, signal);
  const page = toPublicGroupTopicPage(topics, offset, limit);

  return {
    ...page,
    items: page.items.filter((_, index) => {
      const topic = topics.data[index];
      return !topic?.group?.nsfw;
    }),
  };
}

export async function getPublicGroup(
  groupName: string,
  signal?: AbortSignal,
): Promise<PublicGroupDetail> {
  const group = await getBangumiGroup(groupName, signal);

  return {
    ...toPublicGroup(group),
    description: group.description,
    topicCount: group.topics,
  };
}

export async function getPublicGroupTopics(
  groupName: string,
  offset: number,
  signal?: AbortSignal,
): Promise<PublicGroupTopicPage> {
  const limit = 50;
  const topics = await getBangumiGroupTopics(
    groupName,
    offset,
    limit,
    signal,
  );
  return toPublicGroupTopicPage(topics, offset, limit);
}

export async function getPublicGroupTopic(
  topicId: number,
  signal?: AbortSignal,
): Promise<PublicGroupTopic | null> {
  try {
    const topic = await getBangumiGroupTopic(topicId, signal);

    return {
      ...toPublicGroupTopic(topic),
      groupName: topic.group.name,
      groupTitle: topic.group.title,
      replies: mapBangumiReplies(topic.replies),
    };
  } catch (error) {
    if (error instanceof BangumiRequestError && error.status === 404) {
      return null;
    }

    throw error;
  }
}
