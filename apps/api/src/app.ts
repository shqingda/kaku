import { Hono } from 'hono';

export function createApp() {
  const app = new Hono();

  app.get('/health', (context) =>
    context.json({
      service: 'kaku-api',
      status: 'ok',
    }),
  );

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
