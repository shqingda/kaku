import type { Context, Hono } from 'hono';

import { getValidBangumiAccessToken } from '../auth/bangumi-token-service.ts';
import type { AuthDependencies } from '../auth/routes.ts';
import { getAuthStore, mapBangumiAuthError } from '../auth/route-helpers.ts';
import {
  authenticateRequest,
  isAuthenticationResponse,
} from '../auth/session-service.ts';
import type { Env } from '../env.ts';
import {
  BangumiFriendsError,
  getBangumiBlocklist,
  getBangumiUserFriendship,
  setBangumiBlocked,
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

  async function withAuthenticatedRelation(
    context: Context<{ Bindings: Env }>,
    action: (input: { accessToken: string; username: string }) => Promise<{
      [key: string]: unknown;
    }>,
  ) {
    const username = getUsername(context.req.param('username'));

    if (!username) {
      return context.json(
        { error: 'invalid_username', message: '用户名格式不正确。' },
        400,
      );
    }

    const store = getAuthStore(context.env, dependencies.createStore);
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
      const authError = mapBangumiAuthError(context, error);
      if (authError) return authError;

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

      throw error;
    }
  }

  app.get('/me/users/:username', (context) =>
    withAuthenticatedRelation(context, ({ accessToken, username }) =>
      getBangumiUserFriendship({ accessToken, fetcher, username }),
    ),
  );

  app.put('/me/friends/:username', (context) =>
    withAuthenticatedRelation(context, async ({ accessToken, username }) => ({
      isFriend: await setBangumiFriend({
        accessToken,
        fetcher,
        shouldAdd: true,
        username,
      }),
    })),
  );

  app.delete('/me/friends/:username', (context) =>
    withAuthenticatedRelation(context, async ({ accessToken, username }) => ({
      isFriend: await setBangumiFriend({
        accessToken,
        fetcher,
        shouldAdd: false,
        username,
      }),
    })),
  );

  app.get('/me/blocklist', async (context) => {
    const store = getAuthStore(context.env, dependencies.createStore);
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
      return context.json(
        await getBangumiBlocklist({ accessToken, fetcher }),
      );
    } catch (error) {
      const authError = mapBangumiAuthError(context, error);
      if (authError) return authError;

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
          { error: 'bangumi_blocklist_unavailable', message: error.message },
          error.status >= 500 ? 503 : 502,
        );
      }

      throw error;
    }
  });

  app.put('/me/blocklist/:username', (context) =>
    withAuthenticatedRelation(context, ({ accessToken, username }) =>
      setBangumiBlocked({ accessToken, fetcher, shouldBlock: true, username }),
    ),
  );

  app.delete('/me/blocklist/:username', (context) =>
    withAuthenticatedRelation(context, ({ accessToken, username }) =>
      setBangumiBlocked({ accessToken, fetcher, shouldBlock: false, username }),
    ),
  );
}
