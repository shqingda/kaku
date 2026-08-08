import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import { requestBangumiTurnstileToken } from '@/features/auth/bangumi-turnstile';
import { createSubjectTopicReply } from '@/infrastructure/kaku/discussions-client';
import { queryKeys } from '@/lib/query-keys';

export type CreateSubjectTopicReplyInput = {
  content: string;
  replyTo?: number;
};

export function useCreateSubjectTopicReply(topicId: number) {
  const { request } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, replyTo }: CreateSubjectTopicReplyInput) => {
      const turnstileToken = await requestBangumiTurnstileToken();
      return createSubjectTopicReply(request, {
        content,
        replyTo,
        topicId,
        turnstileToken,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.subjectTopic(topicId),
      });
    },
  });
}
