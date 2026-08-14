import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthActions } from '@/features/auth/auth-provider';
import { requestBangumiTurnstileToken } from '@/features/auth/bangumi-turnstile';
import {
  createGroupTopic,
  createSubjectTopic,
} from '@/infrastructure/kaku/discussions-client';

type CreateTopicInput = { content: string; title: string };

export function useCreateSubjectTopic(subjectId: number) {
  const { request } = useAuthActions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTopicInput) => {
      const turnstileToken = await requestBangumiTurnstileToken();
      return createSubjectTopic(request, {
        ...input,
        subjectId,
        turnstileToken,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['discussions', 'bangumi', 'subject', subjectId],
      });
    },
  });
}

export function useCreateGroupTopic(groupName: string) {
  const { request } = useAuthActions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTopicInput) => {
      const turnstileToken = await requestBangumiTurnstileToken();
      return createGroupTopic(request, {
        ...input,
        groupName,
        turnstileToken,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['community', 'bangumi'],
      });
    },
  });
}
