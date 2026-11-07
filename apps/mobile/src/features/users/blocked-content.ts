import type { DiscussionReply } from '../discussions/model.ts';

// Bangumi 的屏蔽名单只拦截通知，内容隐藏由 Kaku 在显示时完成。
// 这里不改查询缓存，所以取消屏蔽后内容立刻恢复，不需要重新请求。
export function isBlockedUser(
  userId: number | undefined,
  blockedIds: ReadonlySet<number>,
) {
  return userId !== undefined && blockedIds.has(userId);
}

export function withoutBlockedAuthors<T extends { authorId?: number }>(
  items: T[],
  blockedIds: ReadonlySet<number>,
) {
  if (blockedIds.size === 0) return items;
  return items.filter((item) => !isBlockedUser(item.authorId, blockedIds));
}

// 回复还要去掉别人对隐藏回复的引用：引用里带着被屏蔽用户的原文，
// 而且目标楼层已不在列表里，保留下来就是一个点了没反应的按钮。
export function withoutBlockedReplies(
  replies: DiscussionReply[],
  blockedIds: ReadonlySet<number>,
) {
  const hiddenIds = new Set(
    replies
      .filter((reply) => isBlockedUser(reply.authorId, blockedIds))
      .map((reply) => reply.id),
  );
  if (hiddenIds.size === 0) return replies;

  return replies
    .filter((reply) => !hiddenIds.has(reply.id))
    .map((reply) =>
      reply.replyTo && hiddenIds.has(reply.replyTo.replyId)
        ? { ...reply, replyTo: undefined }
        : reply,
    );
}
