import type {
  BangumiDiscussionReply,
  BangumiSubjectTopicPage,
  BangumiSubjectTopic,
  BangumiSubjectTopicSummary,
} from '../api-next/schemas';
import type {
  DiscussionReply,
  DiscussionTopic,
  DiscussionTopicPage,
} from '../../../features/discussions/model.ts';
import { getNextTopicOffset } from '../../../features/discussions/topic-pagination.ts';
import {
  cleanBangumiContent,
  parseBangumiContent,
} from '../../../lib/bangumi-content.ts';
import { formatActivityTime } from '../../../lib/format-activity-time.ts';

export { cleanBangumiContent } from '../../../lib/bangumi-content.ts';

function authorName(reply: BangumiDiscussionReply) {
  return (
    reply.creator?.nickname ||
    reply.creator?.username ||
    reply.user?.nickname ||
    reply.user?.username ||
    `用户 ${reply.creatorID}`
  );
}

function toIsoTime(timestamp: number) {
  return new Date(timestamp * 1000).toISOString();
}

export function mapBangumiReplies(
  replies: BangumiDiscussionReply[],
): DiscussionReply[] {
  const repliesById = new Map<number, { author: string; body: string }>();

  function visit(reply: BangumiDiscussionReply, parent?: BangumiDiscussionReply) {
    const author = authorName(reply);
    const user = reply.creator ?? reply.user;
    const body = cleanBangumiContent(reply.content);
    repliesById.set(reply.id, { author, body });
    const relatedReply = reply.relatedID
      ? repliesById.get(reply.relatedID)
      : undefined;
    const parentReply = parent
      ? repliesById.get(parent.id) ?? {
          author: authorName(parent),
          body: cleanBangumiContent(parent.content),
        }
      : undefined;
    const referencedReply = relatedReply ?? parentReply;

    const result: DiscussionReply[] = [
      {
        author,
        authorAvatarUrl:
          user?.avatar?.medium ??
          user?.avatar?.small ??
          user?.avatar?.large,
        authorUsername: user?.username,
        body,
        createdAt: formatActivityTime(reply.createdAt),
        id: String(reply.id),
        replyTo:
          referencedReply
            ? {
                author: referencedReply.author,
                body: referencedReply.body,
                replyId: String(reply.relatedID ?? parent!.id),
              }
            : undefined,
        segments: parseBangumiContent(reply.content),
      },
    ];

    for (const child of reply.replies ?? []) {
      result.push(...visit(child, reply));
    }

    return result;
  }

  return replies.flatMap((reply) => visit(reply));
}

function countBangumiReplies(replies: BangumiDiscussionReply[]): number {
  return replies.reduce(
    (total, reply) =>
      total + 1 + countBangumiReplies(reply.replies ?? []),
    0,
  );
}

type BangumiTopicWithReplies = Pick<
  BangumiSubjectTopicSummary,
  'createdAt' | 'creatorID' | 'replyCount'
> & {
  replies: BangumiDiscussionReply[];
};

export function mapBangumiTopicContent(
  topic: BangumiTopicWithReplies,
): Pick<DiscussionTopic, 'body' | 'replies'> {
  const replies = mapBangumiReplies(topic.replies);
  const firstReply = topic.replies[0];
  // 保留原始 bbcode（含 [img]/[quote]），由 BangumiText 渲染富文本块。
  const body = firstReply ? firstReply.content : '';
  const isTopicBody =
    body.length > 0 &&
    firstReply?.creatorID === topic.creatorID &&
    firstReply.createdAt === topic.createdAt &&
    !firstReply.relatedID &&
    countBangumiReplies(topic.replies) === topic.replyCount + 1;

  if (!isTopicBody) {
    return { replies };
  }

  return {
    body,
    replies: replies.filter((reply) => reply.id !== String(firstReply.id)),
  };
}

function topicAuthor(topic: BangumiSubjectTopicSummary) {
  return (
    topic.creator?.nickname ||
    topic.creator?.username ||
    `用户 ${topic.creatorID}`
  );
}

export function mapBangumiTopicSummary(
  topic: BangumiSubjectTopicSummary,
): DiscussionTopic {
  return {
    author: topicAuthor(topic),
    authorUsername: topic.creator?.username,
    createdAt: formatActivityTime(topic.createdAt),
    id: String(topic.id),
    replies: [],
    replyCount: topic.replyCount,
    subjectId: topic.parentID,
    title: topic.title,
    updatedAt: toIsoTime(topic.updatedAt),
  };
}

export function mapBangumiSubjectTopicPage(
  page: BangumiSubjectTopicPage,
  offset = 0,
): DiscussionTopicPage {
  return {
    nextOffset: getNextTopicOffset(offset, page.data.length, page.total),
    topics: page.data.map(mapBangumiTopicSummary),
    total: page.total,
  };
}

export function mapBangumiTopic(
  topic: BangumiSubjectTopic,
): DiscussionTopic {
  return {
    ...mapBangumiTopicSummary(topic),
    ...mapBangumiTopicContent(topic),
  };
}

export function mapBangumiEpisodeComments(
  replies: BangumiDiscussionReply[],
): DiscussionReply[] {
  return mapBangumiReplies(replies);
}
