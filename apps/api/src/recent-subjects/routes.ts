import type { Hono } from 'hono';
import { z } from 'zod';

import type { AuthDependencies } from '../auth/routes.ts';
import { authenticateContext } from '../auth/route-helpers.ts';
import { isAuthenticationResponse } from '../auth/session-service.ts';
import type { Env } from '../env.ts';
import {
  createD1RecentSubjectsStore,
  type RecentSubjectsStore,
} from './store.ts';

const recentSubjectSchema = z.object({
  coverUrl: z.string().max(2_048).optional(),
  id: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  type: z.number().int().min(1).max(6),
  viewedAt: z.number().nonnegative(),
});

const recentSubjectsSchema = z.object({
  items: z.array(recentSubjectSchema).max(10),
});

export type RecentSubjectsDependencies = {
  createRecentSubjectsStore?: (database: D1Database) => RecentSubjectsStore;
};

export function registerRecentSubjectsRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies & RecentSubjectsDependencies = {},
) {
  const now = dependencies.now ?? Date.now;
  const getStore = (env: Env) =>
    dependencies.createRecentSubjectsStore?.(env.DB) ??
    createD1RecentSubjectsStore(env.DB);

  app.get('/me/recent-subjects', async (context) => {
    const { authentication } = await authenticateContext(
      context,
      dependencies.createStore,
      now,
    );
    if (isAuthenticationResponse(authentication)) return authentication;

    const stored = await getStore(context.env).get(authentication.userId);
    return context.json({
      recentSubjects: stored
        ? { items: stored.items, updatedAt: stored.updatedAt }
        : { items: [], updatedAt: null },
    });
  });

  app.put('/me/recent-subjects', async (context) => {
    const body = recentSubjectsSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!body.success) {
      return context.json(
        { error: 'invalid_recent_subjects', message: '最近浏览格式不正确。' },
        400,
      );
    }

    const { authentication } = await authenticateContext(
      context,
      dependencies.createStore,
      now,
    );
    if (isAuthenticationResponse(authentication)) return authentication;

    const uniqueItems = body.data.items.filter(
      (item, index, items) =>
        items.findIndex((candidate) => candidate.id === item.id) === index,
    );
    const updatedAt = now();
    await getStore(context.env).save({
      items: uniqueItems,
      updatedAt,
      userId: authentication.userId,
    });
    return context.json({
      recentSubjects: { items: uniqueItems, updatedAt },
    });
  });
}
