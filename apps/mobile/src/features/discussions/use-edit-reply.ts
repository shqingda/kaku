import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import {
  editBlogComment,
  editCharacterComment,
  editEpisodeComment,
  editGroupPost,
  editPersonComment,
  editSubjectPost,
} from '@/infrastructure/kaku/discussions-client';
import { queryKeys } from '@/lib/query-keys';

type EditReplyInput = { content: string; postId: number };

export function useEditSubjectReply(topicId: number) {
  const { request } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, postId }: EditReplyInput) =>
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
    mutationFn: ({ content, postId }: EditReplyInput) =>
      editGroupPost(request, postId, content),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.groupTopic(topicId),
      });
    },
  });
}

export function useEditEpisodeReply(episodeId: number) {
  const { request } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, postId }: EditReplyInput) =>
      editEpisodeComment(request, postId, content),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.episodeComments(episodeId),
      });
    },
  });
}

export function useEditReviewReply(reviewId: number) {
  const { request } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, postId }: EditReplyInput) =>
      editBlogComment(request, postId, content),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.subjectReview(reviewId),
      });
    },
  });
}

export function useEditCharacterReply(characterId: number) {
  const { request } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, postId }: EditReplyInput) =>
      editCharacterComment(request, postId, content),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.entityComments('character', characterId),
      });
    },
  });
}

export function useEditPersonReply(personId: number) {
  const { request } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, postId }: EditReplyInput) =>
      editPersonComment(request, postId, content),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.entityComments('person', personId),
      });
    },
  });
}
