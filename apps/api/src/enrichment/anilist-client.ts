import { z } from 'zod';

import type { ForeignMediaTitles } from './match.ts';

const ANILIST_URL = 'https://graphql.anilist.co';

const mediaSchema = z.object({
  averageScore: z.number().nullable(),
  id: z.number().int().positive(),
  siteUrl: z.string().url().nullable(),
  title: z.object({
    english: z.string().nullable(),
    native: z.string().nullable(),
    romaji: z.string().nullable(),
    userPreferred: z.string().nullable(),
  }),
  trailer: z
    .object({
      id: z.string().nullable(),
      site: z.string().nullable(),
    })
    .nullable(),
});

const responseSchema = z.object({
  data: z
    .object({
      Media: mediaSchema.nullable(),
    })
    .nullable(),
});

export class AniListError extends Error {
  constructor(message = 'AniList 暂时没有响应。') {
    super(message);
    this.name = 'AniListError';
  }
}

export type AniListMedia = ForeignMediaTitles & {
  averageScore: number | null;
  id: number;
  siteUrl: string | null;
  trailerUrl: string | null;
};

function trailerUrl(trailer: { id: string | null; site: string | null } | null) {
  if (!trailer?.id || !trailer.site) return null;
  const site = trailer.site.toLowerCase();
  if (site === 'youtube') return `https://www.youtube.com/watch?v=${trailer.id}`;
  if (site === 'dailymotion') {
    return `https://www.dailymotion.com/video/${trailer.id}`;
  }
  return null;
}

export async function searchAniListMedia({
  fetcher = fetch,
  search,
  type,
}: {
  fetcher?: typeof fetch;
  search: string;
  type: 'ANIME' | 'MANGA';
}): Promise<AniListMedia | null> {
  const response = await fetcher(ANILIST_URL, {
    body: JSON.stringify({
      query: `
        query ($search: String, $type: MediaType) {
          Media(search: $search, type: $type) {
            averageScore
            id
            siteUrl
            title { english native romaji userPreferred }
            trailer { id site }
          }
        }
      `,
      variables: { search, type },
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new AniListError();
  }

  const parsed = responseSchema.safeParse(await response.json());
  const media = parsed.success ? parsed.data.data?.Media : null;
  if (!media) return null;

  return {
    averageScore: media.averageScore,
    english: media.title.english ?? undefined,
    id: media.id,
    native: media.title.native ?? undefined,
    romaji: media.title.romaji ?? undefined,
    siteUrl: media.siteUrl,
    trailerUrl: trailerUrl(media.trailer),
    userPreferred: media.title.userPreferred ?? undefined,
  };
}
