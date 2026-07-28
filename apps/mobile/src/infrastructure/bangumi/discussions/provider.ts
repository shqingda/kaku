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

export const bangumiDiscussionsProvider: DiscussionsProvider = {
  async getEpisodeComments(episodeId) {
    const replies = await getBangumiEpisodeComments(episodeId);
    return mapBangumiEpisodeComments(replies);
  },
  async getSubjectTopic(topicId) {
    const topic = await getBangumiSubjectTopic(topicId);
    return mapBangumiTopic(topic);
  },
  async getSubjectTopics(subjectId, limit, offset) {
    const page = await getBangumiSubjectTopics(subjectId, limit, offset);
    return mapBangumiSubjectTopicPage(page, offset);
  },
};
