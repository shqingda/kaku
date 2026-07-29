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
  async getEpisodeComments(episodeId) {
    const replies = await getBangumiEpisodeComments(episodeId);
    return mapBangumiEpisodeComments(replies);
  },
  async getSubjectTopic(topicId) {
    try {
      const topic = await getBangumiSubjectTopic(topicId);
      return mapBangumiTopic(topic);
    } catch (error) {
      if (error instanceof BangumiRequestError && error.status === 404) {
        return null;
      }

      throw error;
    }
  },
  async getSubjectTopics(subjectId, limit, offset) {
    const page = await getBangumiSubjectTopics(subjectId, limit, offset);
    return mapBangumiSubjectTopicPage(page, offset);
  },
};
