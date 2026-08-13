import type { Context, Hono } from 'hono';
import { z } from 'zod';

import { BangumiOAuthError } from '../auth/bangumi-client.ts';
import {
  BangumiReauthorizationRequiredError,
  getValidBangumiAccessToken,
} from '../auth/bangumi-token-service.ts';
import type { AuthDependencies } from '../auth/routes.ts';
import {
  authenticateRequest,
  isAuthenticationResponse,
} from '../auth/session-service.ts';
import { createD1AuthStore } from '../auth/store.ts';
import type { Env } from '../env.ts';
import {
  BangumiReportError,
  createBangumiReport,
} from './bangumi-client.ts';

const reportSchema = z.object({
  type: z.number().int().positive(),
  id: z.number().int().positive(),
  reason: z.number().int().positive(),
  comment: z.string().trim().max(2000).optional(),
});

export function registerReportRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies = {},
) {
  const now = dependencies.now ?? Date.now;
  const fetcher = dependencies.fetcher ?? fetch;

  app.post('/me/reports', async (context: Context<{ Bindings: Env }>) => {
    const parsedBody = reportSchema.safeParse(
      await context.req.json().catch(() => null),
    );

    if (!parsedBody.success) {
      return context.json(
        { error: 'invalid_report', message: '举报内容格式不正确。' },
        400,
      );
    }

    const store = dependencies.createStore
      ? dependencies.createStore(context.env.DB)
      : createD1AuthStore(context.env.DB);
    const authentication = await authenticateRequest(context, store, now());

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
      const result = await createBangumiReport({
        accessToken,
        comment: parsedBody.data.comment,
        fetcher,
        id: parsedBody.data.id,
        reason: parsedBody.data.reason,
        type: parsedBody.data.type,
      });

      return context.json(result);
    } catch (error) {
      if (error instanceof BangumiReauthorizationRequiredError) {
        return context.json(
          { error: 'bangumi_reauthorization_required', message: error.message },
          409,
        );
      }

      if (error instanceof BangumiReportError) {
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
          { error: 'bangumi_report_failed', message: error.message },
          error.status === 429
            ? 429
            : error.status >= 500
              ? 503
              : 502,
        );
      }

      if (error instanceof BangumiOAuthError) {
        return context.json(
          {
            error: 'bangumi_oauth_unavailable',
            message: 'Bangumi 登录服务暂时不可用，请稍后重试。',
          },
          503,
        );
      }

      throw error;
    }
  });
}
