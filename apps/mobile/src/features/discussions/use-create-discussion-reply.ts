import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import { requestBangumiTurnstileToken } from '@/features/auth/bangumi-turnstile';
import {
  createGroupTopicReply,
  createSubjectTopicReply,
} from '@/infrastructure/kaku/discussions-client';
import { queryKeys } from '@/lib/query-keys';

export type CreateDiscussionReplyInput = {
  content: string;
  replyTo?: number;
};

export type DiscussionReplyTarget = {
  id: number;
  kind: 'group-topic' | 'subject-topic';
};

export function useCreateDiscussionReply(target: DiscussionReplyTarget) {
  const { request } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, replyTo }: CreateDiscussionReplyInput) => {
      const turnstileToken = await requestBangumiTurnstileToken();
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
          target.kind === 'group-topic'
            ? queryKeys.groupTopic(target.id)
            : queryKeys.subjectTopic(target.id),
      });
    },
  });
}
