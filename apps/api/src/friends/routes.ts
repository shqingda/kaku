import type { Context, Hono } from 'hono';

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
  BangumiFriendsError,
  getBangumiUserFriendship,
  setBangumiFriend,
} from './bangumi-client.ts';

// Bangumi 用户名由字母、数字与 _- 组成；放宽长度上限以兼容历史账号。
const USERNAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

function getUsername(value: string | undefined) {
  return value && USERNAME_PATTERN.test(value) ? value : null;
}

export function registerFriendRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies = {},
) {
  const now = dependencies.now ?? Date.now;
  const fetcher = dependencies.fetcher ?? fetch;

  async function withAuthenticatedFriendAction(
    context: Context<{ Bindings: Env }>,
    action: (input: { accessToken: string; username: string }) => Promise<{
      isFriend: boolean;
    }>,
  ) {
    const username = getUsername(context.req.param('username'));

    if (!username) {
      return context.json(
        { error: 'invalid_username', message: '用户名格式不正确。' },
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
      const result = await action({ accessToken, username });
      return context.json(result);
    } catch (error) {
      if (error instanceof BangumiReauthorizationRequiredError) {
        return context.json(
          { error: 'bangumi_reauthorization_required', message: error.message },
          409,
        );
      }

      if (error instanceof BangumiFriendsError) {
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
          { error: 'bangumi_friends_unavailable', message: error.message },
          error.status === 429
            ? 429
            : error.status === 404
              ? 404
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
  }

  app.get('/me/users/:username', (context) =>
    withAuthenticatedFriendAction(context, ({ accessToken, username }) =>
      getBangumiUserFriendship({ accessToken, fetcher, username }),
    ),
  );

  app.put('/me/friends/:username', (context) =>
    withAuthenticatedFriendAction(context, async ({ accessToken, username }) => ({
      isFriend: await setBangumiFriend({
        accessToken,
        fetcher,
        shouldAdd: true,
        username,
      }),
    })),
  );

  app.delete('/me/friends/:username', (context) =>
    withAuthenticatedFriendAction(context, async ({ accessToken, username }) => ({
      isFriend: await setBangumiFriend({
        accessToken,
        fetcher,
        shouldAdd: false,
        username,
      }),
    })),
  );
}
