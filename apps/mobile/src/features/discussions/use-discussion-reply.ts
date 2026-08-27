import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthActions } from '@/features/auth/auth-provider';
import { requestBangumiTurnstileToken } from '@/features/auth/bangumi-turnstile';

import {
  discussionReplyOps,
  discussionReplyQueryKey,
  type CreateDiscussionReplyInput,
  type DiscussionReplyTarget,
} from './discussion-reply-target';

export type {
  CreateDiscussionReplyInput,
  DiscussionReplyTarget,
} from './discussion-reply-target';

export function useDiscussionReply(target: DiscussionReplyTarget) {
  const { request } = useAuthActions();
  const queryClient = useQueryClient();
  const ops = discussionReplyOps(target);
  const queryKey = discussionReplyQueryKey(target);

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey });
  }

  const create = useMutation({
    mutationFn: async ({ content, replyTo }: CreateDiscussionReplyInput) => {
      const turnstileToken = await requestBangumiTurnstileToken();
      return ops.create(request, target.id, {
        content,
        replyTo,
        turnstileToken,
      });
    },
    onSuccess: invalidate,
  });

  const edit = useMutation({
    mutationFn: ({
      content,
      postId,
    }: {
      content: string;
      postId: number;
    }) => ops.edit(request, postId, content),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (postId: number) => ops.remove(request, postId),
    onSuccess: invalidate,
  });

  return { create, edit, remove };
}
