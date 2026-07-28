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
  getBangumiGroup,
  getBangumiGroupTopic,
  getBangumiGroupTopics,
} from '../api-next/client';

export async function getPublicCommunity(): Promise<PublicCommunity> {
  const { groups, topics } = await getBangumiCommunity();

  return {
    groups: groups.data
      .filter((group) => !group.nsfw)
      .map(toPublicGroup),
    topics: topics.data
      .filter((topic) => !topic.group?.nsfw)
      .map(toPublicGroupTopic),
  };
}

export async function getPublicGroup(
  groupName: string,
): Promise<PublicGroupDetail> {
  const group = await getBangumiGroup(groupName);

  return {
    ...toPublicGroup(group),
    description: group.description,
    topicCount: group.topics,
  };
}

export async function getPublicGroupTopics(
  groupName: string,
  offset: number,
): Promise<PublicGroupTopicPage> {
  const topics = await getBangumiGroupTopics(groupName, offset);
  return toPublicGroupTopicPage(topics, offset);
}

export async function getPublicGroupTopic(
  topicId: number,
): Promise<PublicGroupTopic> {
  const topic = await getBangumiGroupTopic(topicId);

  return {
    ...toPublicGroupTopic(topic),
    groupName: topic.group.name,
    groupTitle: topic.group.title,
    replies: mapBangumiReplies(topic.replies),
  };
}
