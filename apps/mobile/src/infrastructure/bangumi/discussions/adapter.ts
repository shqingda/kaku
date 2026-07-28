import type {
  BangumiDiscussionReply,
  BangumiSubjectTopic,
  BangumiSubjectTopicSummary,
} from '../api-next/schemas';
import type {
  DiscussionReply,
  DiscussionTopic,
} from '../../../features/discussions/model';
import { formatActivityTime } from '../../../lib/format-activity-time';

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

export function cleanBangumiContent(content: string) {
  return content
    .replace(/\[\/?(?:b|i|u|s|mask|quote|code|url|img)(?:=[^\]]*)?\]/gi, '')
    .replace(/\r\n/g, '\n')
    .trim();
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
      },
    ];

    for (const child of reply.replies ?? []) {
      result.push(...visit(child, reply));
    }

    return result;
  }

  return replies.flatMap((reply) => visit(reply));
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

export function mapBangumiTopic(
  topic: BangumiSubjectTopic,
): DiscussionTopic {
  return {
    ...mapBangumiTopicSummary(topic),
    replies: mapBangumiReplies(topic.replies),
  };
}

export function mapBangumiEpisodeComments(
  replies: BangumiDiscussionReply[],
): DiscussionReply[] {
  return mapBangumiReplies(replies);
}
