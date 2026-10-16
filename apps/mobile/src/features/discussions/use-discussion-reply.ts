import { useAuthMutation } from '@/features/auth/use-auth-mutation';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  const ops = discussionReplyOps(target);
  const queryKey = discussionReplyQueryKey(target);

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey });
  }

  const create = useAuthMutation({
    mutationFn: async ({ content, replyTo }: CreateDiscussionReplyInput, request) => {
      const turnstileToken = await requestBangumiTurnstileToken();
      return ops.create(request, target.id, {
        content,
        replyTo,
        turnstileToken,
      });
    },
    onSuccess: invalidate,
  });

  const edit = useAuthMutation({
    mutationFn: ({
      content,
      postId,
    }: {
      content: string;
      postId: number;
    }, request) => ops.edit(request, postId, content),
    onSuccess: invalidate,
  });

  const remove = useAuthMutation({
    mutationFn: (postId: number, request) => ops.remove(request, postId),
    onSuccess: invalidate,
  });

  return { create, edit, remove };
}
