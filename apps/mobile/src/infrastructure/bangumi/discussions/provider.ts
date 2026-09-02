import type {
  DiscussionReply,
  DiscussionTopic,
  DiscussionTopicPage,
} from '@/features/discussions/model';

import {
  mapBangumiEpisodeComments,
  mapBangumiSubjectTopicPage,
  mapBangumiTopic,
} from './adapter';
import {
  getBangumiEpisodeComments,
  getBangumiSubjectTopic,
  getBangumiSubjectTopics,
} from '../api-next/client';
import { BangumiRequestError } from '../transport/http-client';

export async function getEpisodeComments(
  episodeId: number,
  signal?: AbortSignal,
): Promise<DiscussionReply[]> {
  const replies = await getBangumiEpisodeComments(episodeId, signal);
  return mapBangumiEpisodeComments(replies);
}

export async function getSubjectTopic(
  topicId: number,
  signal?: AbortSignal,
): Promise<DiscussionTopic | null> {
  try {
    const topic = await getBangumiSubjectTopic(topicId, signal);
    return mapBangumiTopic(topic);
  } catch (error) {
    if (error instanceof BangumiRequestError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function getSubjectTopics(
  subjectId: number,
  limit: number,
  offset: number,
  signal?: AbortSignal,
): Promise<DiscussionTopicPage> {
  const page = await getBangumiSubjectTopics(
    subjectId,
    limit,
    offset,
    signal,
  );
  return mapBangumiSubjectTopicPage(page, offset);
}
