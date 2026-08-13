import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import {
  deleteGroupPost,
  deleteSubjectPost,
} from '@/infrastructure/kaku/discussions-client';
import { queryKeys } from '@/lib/query-keys';

export function useDeleteSubjectReply(topicId: number) {
  const { request } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: number) => deleteSubjectPost(request, postId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.subjectTopic(topicId),
      });
    },
  });
}

export function useDeleteGroupReply(topicId: number) {
  const { request } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: number) => deleteGroupPost(request, postId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.groupTopic(topicId),
      });
    },
  });
}
