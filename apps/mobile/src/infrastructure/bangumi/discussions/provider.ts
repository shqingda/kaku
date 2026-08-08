import type { DiscussionsProvider } from '@/features/discussions/model';

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

export const bangumiDiscussionsProvider: DiscussionsProvider = {
  async getEpisodeComments(episodeId, signal) {
    const replies = await getBangumiEpisodeComments(episodeId, signal);
    return mapBangumiEpisodeComments(replies);
  },
  async getSubjectTopic(topicId, signal) {
    try {
      const topic = await getBangumiSubjectTopic(topicId, signal);
      return mapBangumiTopic(topic);
    } catch (error) {
      if (error instanceof BangumiRequestError && error.status === 404) {
        return null;
      }

      throw error;
    }
  },
  async getSubjectTopics(subjectId, limit, offset, signal) {
    const page = await getBangumiSubjectTopics(
      subjectId,
      limit,
      offset,
      signal,
    );
    return mapBangumiSubjectTopicPage(page, offset);
  },
};
