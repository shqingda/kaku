import type { DiscussionReplyTarget } from './discussion-reply-target';

export function replyDraftKey(userId: number, target: DiscussionReplyTarget, replyTo?: string) {
  return `kaku:reply-draft:v1:${JSON.stringify([userId, target.kind, target.id, replyTo ?? null])}`;
}
