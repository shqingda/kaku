import type { Hono } from 'hono';
import { z } from 'zod';

import { getValidBangumiAccessToken } from '../auth/bangumi-token-service.ts';
import type { AuthDependencies } from '../auth/routes.ts';
import {
  authenticateContext,
  mapBangumiAuthError,
} from '../auth/route-helpers.ts';
import { isAuthenticationResponse } from '../auth/session-service.ts';
import type { Env } from '../env.ts';
import {
  BangumiNotificationError,
  getBangumiNotifications,
  markBangumiNotificationsRead,
} from './bangumi-client.ts';

const markReadSchema = z.object({
  ids: z.array(z.number().int().positive()).max(40).optional(),
});

export function registerNotificationRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies = {},
) {
  const now = dependencies.now ?? Date.now;
  const fetcher = dependencies.fetcher ?? fetch;

  app.get('/me/notifications', async (context) => {
    const { authentication, store } = await authenticateContext(
      context,
      dependencies.createStore,
      now,
    );

    if (isAuthenticationResponse(authentication)) {
      return authentication;
    }

    try {
      const accessToken = await getValidBangumiAccessToken({
        env: context.env,
        fetcher,
        now: now(),
        store,
        userId: authentication.userId,
      });

      return context.json(
        await getBangumiNotifications({ accessToken, fetcher }),
      );
    } catch (error) {
      const authError = mapBangumiAuthError(context, error);
      if (authError) return authError;

      if (error instanceof BangumiNotificationError) {
        if (error.status === 401) {
          await store.deleteBangumiCredential(authentication.userId);
          return context.json(
            {
              error: 'bangumi_reauthorization_required',
              message: 'Bangumi 授权已失效，请重新登录。',
            },
            409,
          );
        }

        return context.json(
          { error: 'bangumi_notifications_unavailable', message: error.message },
          error.status >= 500 ? 503 : 502,
        );
      }

      throw error;
    }
  });

  app.post('/me/notifications/read', async (context) => {
    const body = markReadSchema.safeParse(
      await context.req.json().catch(() => null),
    );

    if (!body.success) {
      return context.json(
        { error: 'invalid_notification_ids', message: '通知编号格式不正确。' },
        400,
      );
    }

    const { authentication, store } = await authenticateContext(
      context,
      dependencies.createStore,
      now,
    );

    if (isAuthenticationResponse(authentication)) {
      return authentication;
    }

    try {
      const accessToken = await getValidBangumiAccessToken({
        env: context.env,
        fetcher,
        now: now(),
        store,
        userId: authentication.userId,
      });
      await markBangumiNotificationsRead({
        accessToken,
        fetcher,
        ids: body.data.ids,
      });

      return context.json({});
    } catch (error) {
      const authError = mapBangumiAuthError(context, error);
      if (authError) return authError;

      if (error instanceof BangumiNotificationError) {
        if (error.status === 401) {
          await store.deleteBangumiCredential(authentication.userId);
          return context.json(
            {
              error: 'bangumi_reauthorization_required',
              message: 'Bangumi 授权已失效，请重新登录。',
            },
            409,
          );
        }

        return context.json(
          { error: 'bangumi_notifications_unavailable', message: error.message },
          error.status >= 500 ? 503 : 502,
        );
      }

      throw error;
    }
  });
}
