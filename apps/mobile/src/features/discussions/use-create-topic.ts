import { useAuthMutation } from '@/features/auth/use-auth-mutation';
import { useQueryClient } from '@tanstack/react-query';

import { requestBangumiTurnstileToken } from '@/features/auth/bangumi-turnstile';
import {
  createGroupTopic,
  createSubjectTopic,
} from '@/infrastructure/kaku/discussions-client';

type CreateTopicInput = { content: string; title: string };

export function useCreateSubjectTopic(subjectId: number) {
  const queryClient = useQueryClient();

  return useAuthMutation({
    mutationFn: async (input: CreateTopicInput, request) => {
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
  const queryClient = useQueryClient();

  return useAuthMutation({
    mutationFn: async (input: CreateTopicInput, request) => {
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
