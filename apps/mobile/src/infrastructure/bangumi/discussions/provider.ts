import type { DiscussionsProvider } from '@/features/discussions/model';

import {
  mapBangumiEpisodeComments,
  mapBangumiTopic,
  mapBangumiTopicSummary,
} from './adapter';
import {
  getBangumiEpisodeComments,
  getBangumiSubjectTopic,
  getBangumiSubjectTopics,
} from '../api-next/client';

export const bangumiDiscussionsProvider: DiscussionsProvider = {
  async getEpisodeComments(episodeId) {
    const replies = await getBangumiEpisodeComments(episodeId);
    return mapBangumiEpisodeComments(replies);
  },
  async getSubjectTopic(topicId) {
    const topic = await getBangumiSubjectTopic(topicId);
    return mapBangumiTopic(topic);
  },
  async getSubjectTopics(subjectId, limit) {
    const page = await getBangumiSubjectTopics(subjectId, limit);
    return {
      topics: page.data.map(mapBangumiTopicSummary),
      total: page.total,
    };
  },
};
