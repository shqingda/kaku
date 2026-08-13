import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import { requestBangumiTurnstileToken } from '@/features/auth/bangumi-turnstile';
import {
  createCharacterComment,
  createEpisodeComment,
  createGroupTopicReply,
  createPersonComment,
  createReviewReply,
  createSubjectTopicReply,
} from '@/infrastructure/kaku/discussions-client';
import { queryKeys } from '@/lib/query-keys';

export type CreateDiscussionReplyInput = {
  content: string;
  replyTo?: number;
};

export type DiscussionReplyTarget = {
  id: number;
  kind:
    | 'character'
    | 'episode'
    | 'group-topic'
    | 'person'
    | 'review'
    | 'subject-topic';
};

export function useCreateDiscussionReply(target: DiscussionReplyTarget) {
  const { request } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, replyTo }: CreateDiscussionReplyInput) => {
      const turnstileToken = await requestBangumiTurnstileToken();
      if (target.kind === 'episode') {
        return createEpisodeComment(request, {
          content,
          episodeId: target.id,
          replyTo,
          turnstileToken,
        });
      }

      if (target.kind === 'review') {
        return createReviewReply(request, {
          content,
          replyTo,
          reviewId: target.id,
          turnstileToken,
        });
      }

      if (target.kind === 'character') {
        return createCharacterComment(request, {
          content,
          characterId: target.id,
          replyTo,
          turnstileToken,
        });
      }

      if (target.kind === 'person') {
        return createPersonComment(request, {
          content,
          personId: target.id,
          replyTo,
          turnstileToken,
        });
      }

      const createReply =
        target.kind === 'group-topic'
          ? createGroupTopicReply
          : createSubjectTopicReply;

      return createReply(request, {
        content,
        replyTo,
        topicId: target.id,
        turnstileToken,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey:
          target.kind === 'episode'
            ? queryKeys.episodeComments(target.id)
            : target.kind === 'review'
              ? queryKeys.subjectReview(target.id)
              : target.kind === 'character'
                ? queryKeys.entityComments('character', target.id)
                : target.kind === 'person'
                  ? queryKeys.entityComments('person', target.id)
                  : target.kind === 'group-topic'
                    ? queryKeys.groupTopic(target.id)
                    : queryKeys.subjectTopic(target.id),
      });
    },
  });
}
