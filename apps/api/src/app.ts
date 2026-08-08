import { Hono } from 'hono';

import {
  type AuthDependencies,
  registerAuthRoutes,
} from './auth/routes.ts';
import type { Env } from './env.ts';
import { registerCollectionRoutes } from './collections/routes.ts';
import { registerDiscussionRoutes } from './discussions/routes.ts';
import {
  type RankingDependencies,
  registerRankingRoutes,
} from './rankings/routes.ts';
import { registerTimelineRoutes } from './timeline/routes.ts';

type AppDependencies = AuthDependencies & RankingDependencies;

export function createApp(dependencies: AppDependencies = {}) {
  const app = new Hono<{ Bindings: Env }>();

  app.get('/health', (context) =>
    context.json({
      service: 'kaku-api',
      status: 'ok',
    }),
  );

  registerAuthRoutes(app, dependencies);
  registerCollectionRoutes(app, dependencies);
  registerDiscussionRoutes(app, dependencies);
  registerRankingRoutes(app, dependencies);
  registerTimelineRoutes(app, dependencies);

  app.onError((error, context) => {
    console.error(error);

    return context.json(
      {
        error: 'internal_error',
        message: '服务暂时不可用，请稍后重试。',
      },
      500,
    );
  });

  app.notFound((context) =>
    context.json(
      {
        error: 'not_found',
        message: '没有找到这个 API 路由。',
      },
      404,
    ),
  );

  return app;
}
