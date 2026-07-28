import { z } from 'zod';

import type { WatchingItem } from './model';

const watchingItemSchema = z.object({
  coverUrl: z.string(),
  episodeAirDates: z.array(z.string()),
  id: z.number().int().positive(),
  summary: z.string(),
  title: z.string().min(1),
  totalEpisodes: z.number().int().nonnegative(),
  watchedEpisodeNumbers: z.array(z.number().int().positive()),
  year: z.number().int().nonnegative(),
});

const watchingItemsSchema = z.array(watchingItemSchema);

export function decodeWatchingItems(value: string): WatchingItem[] {
  return watchingItemsSchema.parse(JSON.parse(value));
}

export function encodeWatchingItems(items: WatchingItem[]): string {
  return JSON.stringify(items);
}
