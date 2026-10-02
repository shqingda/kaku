import { useMemo, useState } from 'react';
import { useSpoilerPreference } from '@/features/preferences/spoiler-preference';
import { supportsWatchProgress } from '@/features/catalog/subject-types';
import { useCatalogSubject } from '@/features/catalog/use-catalog-subject';
import { usePersonalCollection, useSavePersonalCollection } from '@/features/collections/use-personal-collection';
import { shouldHideEpisodeDiscussion } from './spoiler-policy';
import { useBangumiEpisodeComments } from './use-bangumi-discussions';

export function useEpisodeDiscussion(subjectId: number, episodeNumber: number, userId?: number) {
  const catalogQuery = useCatalogSubject(subjectId);
  const collectionQuery = usePersonalCollection(subjectId);
  const saveCollection = useSavePersonalCollection(subjectId);
  const catalogSubject = catalogQuery.data;
  const personalCollection = collectionQuery.data;
  const subjectType = catalogSubject?.type ?? 2;
  const isTrack = subjectType === 3;
  const tracksWatchProgress = supportsWatchProgress(subjectType);
  const totalEpisodes = catalogSubject?.totalEpisodes ?? 0;
  const isValidEpisode =
    Number.isInteger(episodeNumber) &&
    episodeNumber >= 1 &&
    episodeNumber <= totalEpisodes;
  const catalogEpisode = catalogSubject?.episodes.find(
    (episode) => episode.number === episodeNumber,
  );
  const spoiler = useSpoilerPreference();
  const discussionScope = `${userId ?? 'guest'}:${subjectId}:${episodeNumber}`;
  const [reveal, setReveal] = useState({ scope: discussionScope, visible: false });
  if (reveal.scope !== discussionScope) setReveal({ scope: discussionScope, visible: false });
  const hiddenDiscussion = shouldHideEpisodeDiscussion({
    enabled: spoiler.enabled,
    supportsProgress: tracksWatchProgress,
    watched: Boolean(userId && collectionQuery.isSuccess && personalCollection?.watchedEpisodeNumbers.includes(episodeNumber)),
    revealed: reveal.scope === discussionScope && reveal.visible,
  });
  const commentsQuery = useBangumiEpisodeComments(catalogEpisode?.id, !hiddenDiscussion);
  const episodeUnit = isTrack ? '曲' : '集';
  const episodeList = useMemo(
    () =>
      [...(catalogSubject?.episodes ?? [])].sort(
        (left, right) => left.number - right.number,
      ),
    [catalogSubject?.episodes],
  );
  const currentEpisodeIndex = episodeList.findIndex(
    (episode) => episode.number === episodeNumber,
  );
  const previousEpisode =
    currentEpisodeIndex > 0 ? episodeList[currentEpisodeIndex - 1] : undefined;
  const nextEpisode =
    currentEpisodeIndex >= 0 && currentEpisodeIndex < episodeList.length - 1
      ? episodeList[currentEpisodeIndex + 1]
      : undefined;

  return {
    catalogQuery, collectionQuery, saveCollection, commentsQuery,
    catalogSubject, catalogEpisode, personalCollection,
    isTrack, tracksWatchProgress, isValidEpisode, episodeUnit,
    previousEpisode, nextEpisode, hiddenDiscussion,
    replies: hiddenDiscussion ? [] : commentsQuery.data ?? [],
    revealDiscussion: () => setReveal({ scope: discussionScope, visible: true }),
  };
}
