import { useAuthMutation } from '@/features/auth/use-auth-mutation';
import { useQueryClient } from '@tanstack/react-query';


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

export function useDiscussionReply(target: DiscussionReplyTarget, requestVerificationToken?: () => Promise<string>) {
  const queryClient = useQueryClient();
  const ops = discussionReplyOps(target);
  const queryKey = discussionReplyQueryKey(target);

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey });
  }

  const create = useAuthMutation({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ content, replyTo }: CreateDiscussionReplyInput, request) => {
      // Read-only/delete consumers do not mount a verification view.
      if (!requestVerificationToken) throw new Error('请在回复编辑器中发布。');
      const turnstileToken = await requestVerificationToken();
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
