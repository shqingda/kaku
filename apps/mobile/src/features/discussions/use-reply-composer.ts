import { useCallback, useState } from 'react';

import { useAuth } from '@/features/auth/auth-provider';

import type { DiscussionReply } from './model';

type ReplyComposerState =
  | { type: 'closed' }
  | { type: 'create'; replyTo?: DiscussionReply }
  | { type: 'edit'; reply: DiscussionReply };

export function useReplyComposer() {
  const { session, signIn } = useAuth();
  const [state, setState] = useState<ReplyComposerState>({ type: 'closed' });

  const close = useCallback(() => {
    setState({ type: 'closed' });
  }, []);

  const open = useCallback(
    async (replyTo?: DiscussionReply) => {
      if (!session) {
        const signedIn = await signIn();
        if (!signedIn) {
          return;
        }
      }

      setState({ type: 'create', replyTo });
    },
    [session, signIn],
  );

  const openEdit = useCallback((reply: DiscussionReply) => {
    setState({ type: 'edit', reply });
  }, []);

  return {
    close,
    open,
    openEdit,
    sheetProps: {
      editing:
        state.type === 'edit'
          ? { content: state.reply.body, postId: Number(state.reply.id) }
          : null,
      onClose: close,
      onEdited: close,
      replyingTo: state.type === 'create' ? state.replyTo : undefined,
      visible: state.type !== 'closed',
    },
  };
}
