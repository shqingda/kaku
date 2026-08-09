import type {
  PublicIndexItem,
  PublicIndexItemPage,
  PublicIndexPage,
  PublicIndexSummary,
} from '../../../features/indexes/model.ts';
import type {
  BangumiIndexPage,
  BangumiIndexRelated,
} from '../api-next/schemas.ts';

export function toPublicIndexSummary(
  index: BangumiIndexPage['data'][number],
): PublicIndexSummary {
  return {
    author:
      index.user?.nickname || index.user?.username || '未知用户',
    authorUsername: index.user?.username,
    id: index.id,
    itemCount: index.total,
    title: index.title,
    updatedAt: index.updatedAt,
  };
}

export function toPublicIndexPage(
  page: BangumiIndexPage,
  offset: number,
  limit: number,
): PublicIndexPage {
  const nextOffset = offset + limit;

  return {
    items: page.data.map(toPublicIndexSummary),
    nextOffset:
      page.data.length > 0 && nextOffset < page.total
        ? nextOffset
        : undefined,
    total: page.total,
  };
}

function toPublicIndexItem(
  relatedItem: BangumiIndexRelated['data'][number],
): PublicIndexItem | undefined {
  const subject = relatedItem.subject;

  if (subject) {
    return {
      comment: relatedItem.comment,
      coverUrl:
        subject.images?.common ??
        subject.images?.medium ??
        subject.images?.small,
      id: subject.id,
      kind: 'subject',
      score: subject.rating?.score,
      title: subject.nameCN.trim() || subject.name,
      type: subject.type,
    };
  }

  const character = relatedItem.character;
  if (character) {
    return {
      comment: relatedItem.comment,
      coverUrl: character.images?.medium ?? character.images?.small,
      id: character.id,
      kind: 'character',
      title: character.nameCN.trim() || character.name,
    };
  }

  const person = relatedItem.person;
  if (person) {
    return {
      comment: relatedItem.comment,
      coverUrl: person.images?.medium ?? person.images?.small,
      id: person.id,
      kind: 'person',
      title: person.nameCN.trim() || person.name,
    };
  }

  const episode = relatedItem.episode;
  if (episode) {
    return {
      comment: relatedItem.comment,
      coverUrl:
        episode.subject?.images?.common ??
        episode.subject?.images?.medium,
      episodeNumber: episode.sort,
      id: episode.id,
      kind: 'episode',
      parentId: episode.subjectID,
      title: episode.nameCN.trim() || episode.name || `第 ${episode.sort} 话`,
    };
  }

  const blog = relatedItem.blog;
  if (blog) {
    return {
      comment: relatedItem.comment,
      coverUrl: blog.icon,
      id: blog.id,
      kind: 'blog',
      title: blog.title,
    };
  }

  const groupTopic = relatedItem.groupTopic;
  if (groupTopic) {
    return {
      comment: relatedItem.comment,
      coverUrl:
        groupTopic.group?.icon?.medium ??
        groupTopic.group?.icon?.small,
      groupName: groupTopic.group?.name,
      id: groupTopic.id,
      kind: 'groupTopic',
      title: groupTopic.title,
    };
  }

  const subjectTopic = relatedItem.subjectTopic;
  if (subjectTopic) {
    return {
      comment: relatedItem.comment,
      coverUrl:
        subjectTopic.subject?.images?.common ??
        subjectTopic.subject?.images?.medium,
      id: subjectTopic.id,
      kind: 'subjectTopic',
      parentId: subjectTopic.parentID,
      title: subjectTopic.title,
    };
  }

  return undefined;
}

export function toPublicIndexItemPage(
  page: BangumiIndexRelated,
  offset: number,
): PublicIndexItemPage {
  const nextOffset = offset + page.data.length;

  return {
    items: page.data
      .map(toPublicIndexItem)
      .filter((item): item is PublicIndexItem => item !== undefined),
    nextOffset:
      page.data.length > 0 && nextOffset < page.total
        ? nextOffset
        : undefined,
    total: page.total,
  };
}
