import type { CollectionStatus } from '@/features/watching/model';

import type {
  PublicUserBlog,
  PublicUserBlogPage,
  PublicUserCollection,
  PublicUserCollectionPage,
  PublicUserFriend,
  PublicUserFriendPage,
  PublicUserEntityCollectionPage,
  PublicUserEntityKind,
  PublicTimelineItem,
  PublicTimelinePage,
} from '../../../features/users/model.ts';
import type {
  BangumiUserTimeline,
  BangumiUserBlogs,
  BangumiUserFriends,
} from '../api-next/schemas.ts';
import type {
  BangumiUserCharacterCollectionsResponse,
  BangumiUserCollectionsResponse,
  BangumiUserPersonCollectionsResponse,
} from '../api-v0/schemas.ts';

const COLLECTION_STATUS: Record<number, CollectionStatus> = {
  1: 'wish',
  2: 'completed',
  3: 'doing',
  4: 'onHold',
  5: 'dropped',
};

const TIMELINE_COLLECTION_VERBS: Record<number, string> = {
  1: '想读',
  2: '想看',
  3: '想听',
  4: '想玩',
  5: '读过',
  6: '看过',
  7: '听过',
  8: '玩过',
  9: '在读',
  10: '在看',
  11: '在听',
  12: '在玩',
  13: '搁置了',
  14: '抛弃了',
};

function secureImage(url?: string) {
  return url?.replace(/^http:/, 'https:');
}

export function toPublicUserCollection(
  collection: BangumiUserCollectionsResponse['data'][number],
  subjectType: number,
): PublicUserCollection {
  return {
    collectionStatus: COLLECTION_STATUS[collection.type],
    coverUrl: secureImage(
      collection.subject.images?.common ??
        collection.subject.images?.medium ??
        collection.subject.images?.small,
    ),
    id: collection.subject.id,
    progress: collection.ep_status,
    rate: collection.rate > 0 ? collection.rate : undefined,
    subjectType,
    title:
      collection.subject.name_cn.trim() || collection.subject.name,
    totalEpisodes: collection.subject.eps,
    updatedAt: collection.updated_at,
    volumeProgress: collection.vol_status,
  };
}

export function toPublicUserCollectionPage(
  response: BangumiUserCollectionsResponse,
  subjectType = 2,
): PublicUserCollectionPage {
  const nextOffset = response.offset + response.data.length;

  return {
    items: response.data.map((collection) =>
      toPublicUserCollection(collection, subjectType),
    ),
    nextOffset:
      nextOffset < response.total ? nextOffset : undefined,
    total: response.total,
  };
}

export function toPublicUserBlog(
  blog: BangumiUserBlogs['data'][number],
): PublicUserBlog {
  return {
    id: blog.id,
    replyCount: blog.replies,
    summary: blog.summary,
    title: blog.title,
    updatedAt: blog.updatedAt || blog.createdAt,
  };
}

export function toPublicUserBlogPage(
  response: BangumiUserBlogs,
  offset: number,
): PublicUserBlogPage {
  const nextOffset = offset + response.data.length;

  return {
    items: response.data.map(toPublicUserBlog),
    nextOffset:
      nextOffset < response.total ? nextOffset : undefined,
    total: response.total,
  };
}

export function toPublicUserFriend(
  friend: BangumiUserFriends['data'][number],
): PublicUserFriend {
  return {
    avatarUrl: secureImage(
      friend.avatar?.medium ??
        friend.avatar?.small ??
        friend.avatar?.large,
    ),
    nickname: friend.nickname || friend.username,
    username: friend.username,
  };
}

export function toPublicUserFriendPage(
  response: BangumiUserFriends,
  offset: number,
): PublicUserFriendPage {
  const nextOffset = offset + response.data.length;

  return {
    items: response.data.map(toPublicUserFriend),
    nextOffset:
      nextOffset < response.total ? nextOffset : undefined,
    total: response.total,
  };
}

const PERSON_CAREER_LABELS: Record<string, string> = {
  actor: '演员',
  artist: '艺术家',
  illustrator: '插画家',
  mangaka: '漫画家',
  producer: '制作人',
  seiyu: '声优',
  writer: '作家',
};

export function toPublicUserEntityCollectionPage(
  response:
    | BangumiUserCharacterCollectionsResponse
    | BangumiUserPersonCollectionsResponse,
  kind: PublicUserEntityKind,
): PublicUserEntityCollectionPage {
  return {
    items: response.data.map((entity) => ({
      collectedAt: entity.created_at,
      id: entity.id,
      imageUrl: secureImage(
        entity.images?.medium ??
          entity.images?.large ??
          entity.images?.small,
      ),
      kind,
      name: entity.name,
      subtitle:
        kind === 'person' && 'career' in entity
          ? entity.career
              .map((career) => PERSON_CAREER_LABELS[career] ?? career)
              .join(' · ') || '人物'
          : '角色',
    })),
    total: response.total,
  };
}

export function toPublicTimelineItem(
  item: BangumiUserTimeline[number],
): PublicTimelineItem {
  const firstSubject = item.memo.subject?.[0];
  const progressBatch = item.memo.progress?.batch;
  const progressSingle = item.memo.progress?.single;
  const wikiSubject = item.memo.wiki?.subject;
  const subject =
    firstSubject?.subject ??
    progressBatch?.subject ??
    progressSingle?.subject ??
    wikiSubject;

  const subjectTitle = subject
    ? subject.nameCN?.trim() || subject.name
    : undefined;
  let leadingText: string | undefined;
  let trailingText: string | undefined;
  const withSubject = (leading: string, trailing = '') => {
    if (!subjectTitle) {
      return leading.trim();
    }

    leadingText = leading;
    trailingText = trailing;
    return `${leading}《${subjectTitle}》${trailing}`;
  };

  let text = '更新了一条动态';

  switch (item.cat) {
    case 1:
      if (item.type === 2 && item.memo.daily?.users?.length) {
        text = `将 ${item.memo.daily.users
          .map((user) => user.nickname || user.username)
          .join('、')} 加为了好友`;
        break;
      }
      text =
        item.type === 1
          ? '加入了 Bangumi'
          : item.type === 2
            ? '添加了好友'
            : item.type === 3
              ? '加入了小组'
              : item.type === 4
                ? '创建了小组'
                : item.type === 5
                  ? '加入了乐园'
                  : '完成了一项日常活动';
      break;
    case 8: {
      const character = item.memo.mono?.characters[0];
      const person = item.memo.mono?.persons[0];
      const entity = character ?? person;
      text = entity
        ? `${item.type === 1 ? '收藏了' : '创建了'}${character ? '角色' : '人物'} ${entity.nameCN?.trim() || entity.name}`
        : '更新了人物收藏';
      break;
    }
    case 2:
      text = wikiSubject ? withSubject('编辑了条目 ') : '参与了条目编辑';
      break;
    case 3:
      text = firstSubject
        ? withSubject(
            `${item.batch ? '收藏了' : (TIMELINE_COLLECTION_VERBS[item.type] ?? '收藏了')} `,
            firstSubject.comment ? `：${firstSubject.comment}` : '',
          )
        : '更新了收藏';
      break;
    case 4:
      if (progressBatch) {
        const progress =
          progressBatch.epsUpdate !== undefined
            ? `${progressBatch.epsUpdate} of ${progressBatch.epsTotal} 话`
            : progressBatch.volsUpdate !== undefined
              ? `${progressBatch.volsUpdate} of ${progressBatch.volsTotal} 卷`
              : '';
        text = withSubject('完成了 ', progress ? ` ${progress}` : '');
      } else if (progressSingle) {
        const verb =
          item.type === 1 ? '想看' : item.type === 2 ? '看过' : '抛弃了';
        text = withSubject(
          `${verb} `,
          ` 第 ${progressSingle.episode.sort} 话`,
        );
      } else {
        text = '更新了观看进度';
      }
      break;
    case 5:
      text =
        item.memo.status?.tsukkomi ??
        item.memo.status?.sign ??
        (item.memo.status?.nickname
          ? `将昵称改为 ${item.memo.status.nickname.after}`
          : '更新了状态');
      break;
    case 6:
      text = item.memo.blog
        ? `发表了日志《${item.memo.blog.title}》`
        : '发表了日志';
      break;
    case 7:
      text = item.memo.index
        ? `更新了目录《${item.memo.index.title}》`
        : '更新了目录';
      break;
  }

  return {
    createdAt: item.createdAt,
    id: item.id,
    leadingText,
    subjectId: subject?.id,
    subjectTitle: leadingText !== undefined ? subjectTitle : undefined,
    text,
    trailingText,
  };
}

export function toPublicTimelinePage(
  timeline: BangumiUserTimeline,
  limit: number,
): PublicTimelinePage {
  const lastItem = timeline.at(-1);

  return {
    items: timeline.map(toPublicTimelineItem),
    nextCursor:
      timeline.length === limit && lastItem
        ? String(lastItem.id)
        : undefined,
  };
}
