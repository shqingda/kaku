import type { Hono } from 'hono';

import type { AuthDependencies } from '../auth/routes.ts';
import type { Env } from '../env.ts';
import { getPublicCache, servePublicCached } from '../public-cache.ts';
import {
  BangumiPeopleListError,
  getBangumiPeople,
  type PeopleSort,
} from './bangumi-client.ts';
import type { PublicPersonKind } from './model.ts';

const KINDS = new Set<PublicPersonKind>(['character', 'person']);
const SORTS = new Set<PeopleSort>(['collects', 'comment', 'dateline', 'title']);
const CHARACTER_TYPES = new Set([1, 2, 3, 4]);
const PERSON_TYPES = new Set([1, 2, 3, 4, 6, 7, 8]);

function optionalInteger(value?: string) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
}

export function registerPeopleBrowserRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies = {},
) {
  const fetcher = dependencies.fetcher ?? fetch;

  app.get('/public/people', async (context) => {
    const kind = context.req.query('kind') ?? 'character';
    const sort = context.req.query('sort') ?? 'dateline';
    const page = Number(context.req.query('page') ?? 1);
    const type = optionalInteger(context.req.query('type'));
    const gender = optionalInteger(context.req.query('gender'));
    const allowedTypes = kind === 'character' ? CHARACTER_TYPES : PERSON_TYPES;

    if (
      !KINDS.has(kind as PublicPersonKind) ||
      !SORTS.has(sort as PeopleSort) ||
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 999 ||
      (type !== undefined && !allowedTypes.has(type)) ||
      (gender !== undefined && gender !== 1 && gender !== 2)
    ) {
      return context.json(
        { error: 'invalid_people_query', message: '人物筛选条件或页码无效。' },
        400,
      );
    }

    return servePublicCached(context, getPublicCache(), 300, async () => {
      try {
        const result = await getBangumiPeople({
          fetcher,
          gender,
          kind: kind as PublicPersonKind,
          page,
          sort: sort as PeopleSort,
          type,
        });
        context.header(
          'Cache-Control',
          'public, max-age=300, stale-while-revalidate=1800',
        );
        return context.json(result);
      } catch (error) {
        if (error instanceof BangumiPeopleListError) {
          return context.json(
            { error: 'bangumi_people_unavailable', message: error.message },
            error.status >= 500 ? 503 : 502,
          );
        }
        throw error;
      }
    });
  });
}
