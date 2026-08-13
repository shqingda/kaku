import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import {
  editGroupPost,
  editSubjectPost,
} from '@/infrastructure/kaku/discussions-client';
import { queryKeys } from '@/lib/query-keys';

export function useEditSubjectReply(topicId: number) {
  const { request } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, postId }: { content: string; postId: number }) =>
      editSubjectPost(request, postId, content),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.subjectTopic(topicId),
      });
    },
  });
}

export function useEditGroupReply(topicId: number) {
  const { request } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, postId }: { content: string; postId: number }) =>
      editGroupPost(request, postId, content),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.groupTopic(topicId),
      });
    },
  });
}
