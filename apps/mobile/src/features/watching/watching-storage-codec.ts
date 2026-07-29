import { z } from 'zod';

import type { WatchingItem } from './model';

const watchingItemSchema = z.object({
  collectionStatus: z
    .enum(['wish', 'completed', 'doing', 'onHold', 'dropped'])
    .nullable()
    .optional(),
  coverUrl: z.string(),
  episodeAirDates: z.array(z.string()),
  id: z.number().int().positive(),
  summary: z.string(),
  title: z.string().min(1),
  totalEpisodes: z.number().int().nonnegative(),
  rating: z.number().int().min(1).max(10).optional(),
  type: z.number().int().positive().optional(),
  watchedEpisodeNumbers: z.array(z.number().int().positive()),
  year: z.number().int().nonnegative(),
}).transform((item) => {
  const watchedEpisodeNumbers =
    item.collectionStatus === 'wish' ? [] : item.watchedEpisodeNumbers;
  const collectionStatus =
    watchedEpisodeNumbers.length > 0 && item.collectionStatus == null
      ? 'doing' as const
      : item.collectionStatus ?? null;

  return {
    ...item,
    collectionStatus,
    type: item.type ?? 2,
    watchedEpisodeNumbers,
  };
});

const watchingItemsSchema = z.array(watchingItemSchema);

export function decodeWatchingItems(value: string): WatchingItem[] {
  return watchingItemsSchema.parse(JSON.parse(value));
}

export function encodeWatchingItems(items: WatchingItem[]): string {
  return JSON.stringify(items);
}
