import { Hono } from 'hono';

import {
  type AuthDependencies,
  registerAuthRoutes,
} from './auth/routes.ts';
import type { Env } from './env.ts';
import { registerBlogRoutes } from './blogs/routes.ts';
import { registerChannelRoutes } from './channels/routes.ts';
import { registerBrowseRoutes } from './browse/routes.ts';
import { registerCollectionRoutes } from './collections/routes.ts';
import { registerDiscussionRoutes } from './discussions/routes.ts';
import { registerIndexRoutes } from './indexes/routes.ts';
import { registerNotificationRoutes } from './notifications/routes.ts';
import { registerPeopleBrowserRoutes } from './people-browser/routes.ts';
import {
  type RankingDependencies,
  registerRankingRoutes,
} from './rankings/routes.ts';
import { registerTimelineRoutes } from './timeline/routes.ts';
import { registerTagRoutes } from './tags/routes.ts';
import { registerWikiRoutes } from './wiki/routes.ts';

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
  registerBlogRoutes(app, dependencies);
  registerBrowseRoutes(app, dependencies);
  registerChannelRoutes(app, dependencies);
  registerCollectionRoutes(app, dependencies);
  registerDiscussionRoutes(app, dependencies);
  registerIndexRoutes(app, dependencies);
  registerNotificationRoutes(app, dependencies);
  registerPeopleBrowserRoutes(app, dependencies);
  registerRankingRoutes(app, dependencies);
  registerTagRoutes(app, dependencies);
  registerTimelineRoutes(app, dependencies);
  registerWikiRoutes(app, dependencies);

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
