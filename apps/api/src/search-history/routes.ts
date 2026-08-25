import type { Hono } from 'hono';
import { z } from 'zod';

import type { AuthDependencies } from '../auth/routes.ts';
import { authenticateContext } from '../auth/route-helpers.ts';
import { isAuthenticationResponse } from '../auth/session-service.ts';
import type { Env } from '../env.ts';
import {
  createD1SearchHistoryStore,
  type SearchHistoryStore,
} from './store.ts';

const searchHistorySchema = z.object({
  items: z.array(z.string().trim().min(1).max(80)).max(8),
});

export type SearchHistoryDependencies = {
  createSearchHistoryStore?: (database: D1Database) => SearchHistoryStore;
};

export function registerSearchHistoryRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies & SearchHistoryDependencies = {},
) {
  const now = dependencies.now ?? Date.now;
  const getStore = (env: Env) =>
    dependencies.createSearchHistoryStore?.(env.DB) ??
    createD1SearchHistoryStore(env.DB);

  app.get('/me/search-history', async (context) => {
    const { authentication } = await authenticateContext(
      context,
      dependencies.createStore,
      now,
    );
    if (isAuthenticationResponse(authentication)) return authentication;

    const stored = await getStore(context.env).get(authentication.userId);
    return context.json({
      history: stored
        ? { items: stored.items, updatedAt: stored.updatedAt }
        : { items: [], updatedAt: null },
    });
  });

  app.put('/me/search-history', async (context) => {
    const body = searchHistorySchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!body.success) {
      return context.json(
        { error: 'invalid_search_history', message: '搜索历史格式不正确。' },
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
      (item, index, items) => items.indexOf(item) === index,
    );
    const updatedAt = now();
    await getStore(context.env).save({
      items: uniqueItems,
      updatedAt,
      userId: authentication.userId,
    });
    return context.json({ history: { items: uniqueItems, updatedAt } });
  });
}
