import type { Hono } from 'hono';

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
  BangumiTimelineError,
  createBangumiTimelineSay,
  getBangumiFriendTimeline,
} from './bangumi-client.ts';

const MAX_TIMELINE_CONTENT_LENGTH = 380;
const MAX_TURNSTILE_TOKEN_LENGTH = 2048;

export function registerTimelineRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies = {},
) {
  const now = dependencies.now ?? Date.now;
  const fetcher = dependencies.fetcher ?? fetch;

  app.get('/me/timeline', async (context) => {
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
      const items = await getBangumiFriendTimeline({ accessToken, fetcher });

      return context.json({ items });
    } catch (error) {
      if (error instanceof BangumiReauthorizationRequiredError) {
        return context.json(
          { error: 'bangumi_reauthorization_required', message: error.message },
          409,
        );
      }

      if (error instanceof BangumiTimelineError) {
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
          { error: 'bangumi_timeline_unavailable', message: error.message },
          error.status >= 500 ? 503 : 502,
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

  app.post('/me/timeline', async (context) => {
    const store = dependencies.createStore
      ? dependencies.createStore(context.env.DB)
      : createD1AuthStore(context.env.DB);
    const authentication = await authenticateRequest(context, store, now());

    if (isAuthenticationResponse(authentication)) {
      return authentication;
    }

    const body = await context.req.json().catch(() => null);
    const content =
      body && typeof body === 'object' && 'content' in body
        ? body.content
        : undefined;
    const turnstileToken =
      body && typeof body === 'object' && 'turnstileToken' in body
        ? body.turnstileToken
        : undefined;

    if (
      typeof content !== 'string' ||
      content.trim().length === 0 ||
      content.length > MAX_TIMELINE_CONTENT_LENGTH ||
      typeof turnstileToken !== 'string' ||
      turnstileToken.length === 0 ||
      turnstileToken.length > MAX_TURNSTILE_TOKEN_LENGTH
    ) {
      return context.json(
        {
          error: 'invalid_timeline_post',
          message: '动态需为 1–380 个字符，并完成安全验证。',
        },
        400,
      );
    }

    try {
      const accessToken = await getValidBangumiAccessToken({
        env: context.env,
        fetcher,
        now: now(),
        store,
        userId: authentication.userId,
      });
      const result = await createBangumiTimelineSay({
        accessToken,
        content: content.trim(),
        fetcher,
        turnstileToken,
      });

      return context.json(result);
    } catch (error) {
      if (error instanceof BangumiReauthorizationRequiredError) {
        return context.json(
          { error: 'bangumi_reauthorization_required', message: error.message },
          409,
        );
      }

      if (error instanceof BangumiTimelineError) {
        if (error.status === 401 && error.code !== 'CAPTCHA_ERROR') {
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
          { error: 'bangumi_timeline_publish_failed', message: error.message },
          error.code === 'CAPTCHA_ERROR'
            ? 400
            : error.status === 429
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
