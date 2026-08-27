import { anilistMediaTypeForSubject } from '@kaku/shared';
import type { Hono } from 'hono';

import type { Env } from '../env.ts';
import {
  getPublicCache,
  servePublicCached,
  type PublicCache,
} from '../public-cache.ts';

import { AniListError, searchAniListMedia } from './anilist-client.ts';
import {
  BangumiSubjectError,
  getBangumiSubjectSummary,
} from './bangumi-client.ts';
import { pickExactTitleMatch } from './match.ts';
import type { SubjectEnrichment } from './model.ts';

const ENRICHMENT_TTL_SECONDS = 6 * 60 * 60;

export type EnrichmentDependencies = {
  cache?: PublicCache;
  fetcher?: typeof fetch;
};

function unmatched(): SubjectEnrichment {
  return { matched: false, provider: 'anilist' };
}

export function registerEnrichmentRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: EnrichmentDependencies = {},
) {
  const fetcher = dependencies.fetcher ?? fetch;

  app.get('/public/subjects/:subjectId/enrichment', async (context) => {
    const subjectId = Number(context.req.param('subjectId'));
    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      return context.json(
        { error: 'invalid_subject_id', message: '条目 ID 不正确。' },
        400,
      );
    }

    return servePublicCached(
      context,
      getPublicCache(dependencies.cache),
      ENRICHMENT_TTL_SECONDS,
      async () => {
        try {
          const subject = await getBangumiSubjectSummary({ fetcher, subjectId });
          const mediaType = anilistMediaTypeForSubject(subject.type);
          if (!mediaType) {
            return context.json({ enrichment: unmatched() });
          }

          const search = subject.originalTitle || subject.title;
          const media = await searchAniListMedia({
            fetcher,
            search,
            type: mediaType,
          });
          const matched = media
            ? pickExactTitleMatch(subject, [media])
            : undefined;

          if (!matched) {
            return context.json({ enrichment: unmatched() });
          }

          const enrichment: SubjectEnrichment = {
            matched: true,
            provider: 'anilist',
            score: matched.averageScore ?? undefined,
            title:
              matched.native ??
              matched.userPreferred ??
              matched.romaji ??
              matched.english,
            trailerUrl: matched.trailerUrl ?? undefined,
            url: matched.siteUrl ?? undefined,
          };
          return context.json({ enrichment });
        } catch (error) {
          if (error instanceof BangumiSubjectError) {
            return context.json(
              { error: 'bangumi_unavailable', message: error.message },
              error.status >= 500 ? 503 : 502,
            );
          }

          if (error instanceof AniListError) {
            return context.json(
              { error: 'anilist_unavailable', message: error.message },
              503,
            );
          }

          throw error;
        }
      },
    );
  });
}
