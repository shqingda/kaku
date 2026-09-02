import type {
  CatalogEpisode,
  CatalogSubject,
} from '@/features/catalog/model';
import { usesEpisodeData } from '@/features/catalog/subject-types';

import {
  getBangumiEpisodes,
  getBangumiSubject,
} from '../api-v0/client';
import type {
  BangumiEpisodeResponse,
  BangumiSubjectResponse,
} from '../api-v0/schemas';

type BangumiInfoboxValue = NonNullable<
  BangumiSubjectResponse['infobox']
>[number]['value'];

function preferChineseName(chineseName: string, originalName: string) {
  return chineseName.trim() || originalName;
}

function formatInfoboxValue(value: BangumiInfoboxValue) {
  if (typeof value === 'string') {
    return value;
  }

  return value
    .map((item) => (item.k ? `${item.k}：${item.v}` : item.v))
    .join(' / ');
}

function findInfoboxValue(subject: BangumiSubjectResponse, key: string) {
  const item = subject.infobox?.find((entry) => entry.key === key);
  return item ? formatInfoboxValue(item.value) : undefined;
}

function toCatalogEpisode(episode: BangumiEpisodeResponse): CatalogEpisode {
  return {
    airDate: episode.airdate || undefined,
    description: episode.desc,
    discussionCount: episode.comment,
    duration: episode.duration || undefined,
    id: episode.id,
    number: episode.ep,
    originalTitle: episode.name,
    title: preferChineseName(episode.name_cn, episode.name),
  };
}

function toCatalogSubject(
  subject: BangumiSubjectResponse,
  episodes: BangumiEpisodeResponse[],
): CatalogSubject {
  return {
    collectionStats: subject.collection
      ? {
          completed: subject.collection.collect,
          doing: subject.collection.doing,
          dropped: subject.collection.dropped,
          onHold: subject.collection.on_hold,
          wish: subject.collection.wish,
        }
      : undefined,
    coverUrl: subject.images?.large ?? subject.images?.common,
    details: {
      edition: findInfoboxValue(subject, '版本特性'),
      gameGenre: findInfoboxValue(subject, '游戏类型'),
      pageCount: findInfoboxValue(subject, '页数'),
      platforms: findInfoboxValue(subject, '平台'),
    },
    episodes: episodes.map(toCatalogEpisode).sort((a, b) => a.number - b.number),
    format: subject.platform || undefined,
    id: subject.id,
    info:
      subject.infobox?.map((item) => ({
        key: item.key,
        value: formatInfoboxValue(item.value),
      })) ?? [],
    originalTitle: subject.name,
    rating: subject.rating
      ? {
          distribution: Object.fromEntries(
            Object.entries(subject.rating.count ?? {}).map(([score, count]) => [
              Number(score),
              count,
            ]),
          ),
          rank: subject.rating.rank > 0 ? subject.rating.rank : undefined,
          score: subject.rating.score,
          votes: subject.rating.total,
        }
      : undefined,
    releaseDate: subject.date || undefined,
    summary: subject.summary,
    tags:
      subject.meta_tags?.slice(0, 5) ??
      subject.tags?.slice(0, 5).map((tag) => tag.name) ??
      [],
    title: preferChineseName(subject.name_cn, subject.name),
    totalEpisodes: subject.eps || episodes.length || subject.total_episodes,
    type: subject.type,
    year: subject.date ? Number(subject.date.slice(0, 4)) : undefined,
  };
}

export async function getCatalogSubject(
  subjectId: number,
  signal?: AbortSignal,
): Promise<CatalogSubject> {
  const subject = await getBangumiSubject(subjectId, signal);
  const episodes = usesEpisodeData(subject.type)
    ? await getBangumiEpisodes(subjectId, signal)
    : [];

  return toCatalogSubject(subject, episodes);
}
