import { useAuthMutation } from '@/features/auth/use-auth-mutation';
import { useQueryClient } from '@tanstack/react-query';

import {
  createGroupTopic,
  createSubjectTopic,
} from '@/infrastructure/kaku/discussions-client';

type CreateTopicInput = { content: string; title: string };

export function useCreateSubjectTopic(subjectId: number, requestVerificationToken: () => Promise<string>) {
  const queryClient = useQueryClient();

  return useAuthMutation({
    networkMode: 'always',
    retry: false,
    mutationFn: async (input: CreateTopicInput, request) => {
      const turnstileToken = await requestVerificationToken();
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

export function useCreateGroupTopic(groupName: string, requestVerificationToken: () => Promise<string>) {
  const queryClient = useQueryClient();

  return useAuthMutation({
    networkMode: 'always',
    retry: false,
    mutationFn: async (input: CreateTopicInput, request) => {
      const turnstileToken = await requestVerificationToken();
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
