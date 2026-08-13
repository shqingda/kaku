import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import {
  deleteBlogComment,
  deleteCharacterComment,
  deleteEpisodeComment,
  deleteGroupPost,
  deletePersonComment,
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

export function useDeleteEpisodeReply(episodeId: number) {
  const { request } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: number) => deleteEpisodeComment(request, commentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.episodeComments(episodeId),
      });
    },
  });
}

export function useDeleteReviewReply(reviewId: number) {
  const { request } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: number) => deleteBlogComment(request, commentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.subjectReview(reviewId),
      });
    },
  });
}

export function useDeleteCharacterReply(characterId: number) {
  const { request } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: number) =>
      deleteCharacterComment(request, commentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.entityComments('character', characterId),
      });
    },
  });
}

export function useDeletePersonReply(personId: number) {
  const { request } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: number) => deletePersonComment(request, commentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.entityComments('person', personId),
      });
    },
  });
}
