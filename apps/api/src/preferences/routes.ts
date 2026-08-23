import type { Hono } from 'hono';
import { z } from 'zod';

import type { AuthDependencies } from '../auth/routes.ts';
import { getAuthStore } from '../auth/route-helpers.ts';
import {
  authenticateRequest,
  isAuthenticationResponse,
} from '../auth/session-service.ts';
import type { Env } from '../env.ts';
import {
  createD1PreferencesStore,
  DEFAULT_USER_PREFERENCES,
  type PreferencesStore,
  type UserPreferences,
} from './store.ts';

const preferencesUpdateSchema = z.object({
  locale: z.enum(['system', 'zh', 'en']).optional(),
  theme: z.enum(['system', 'light', 'dark']).optional(),
});

export type PreferencesDependencies = {
  createPreferencesStore?: (database: D1Database) => PreferencesStore;
};

function getPreferencesStore(
  env: Env,
  dependencies: PreferencesDependencies,
): PreferencesStore {
  return dependencies.createPreferencesStore
    ? dependencies.createPreferencesStore(env.DB)
    : createD1PreferencesStore(env.DB);
}

function toStoredPreferences(
  userId: number,
  current: UserPreferences | null,
  input: z.infer<typeof preferencesUpdateSchema>,
  now: number,
): UserPreferences {
  return {
    locale: input.locale ?? current?.locale ?? DEFAULT_USER_PREFERENCES.locale,
    theme: input.theme ?? current?.theme ?? DEFAULT_USER_PREFERENCES.theme,
    updatedAt: now,
    userId,
  };
}

export function registerPreferenceRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies & PreferencesDependencies = {},
) {
  const now = dependencies.now ?? Date.now;

  app.get('/me/preferences', async (context) => {
    const store = getAuthStore(context.env, dependencies.createStore);
    const authentication = await authenticateRequest(context, store, now());

    if (isAuthenticationResponse(authentication)) {
      return authentication;
    }

    const preferencesStore = getPreferencesStore(context.env, dependencies);
    const preferences = await preferencesStore.get(authentication.userId);

    return context.json({
      preferences: preferences
        ? {
            locale: preferences.locale,
            theme: preferences.theme,
            updatedAt: preferences.updatedAt,
          }
        : {
            locale: DEFAULT_USER_PREFERENCES.locale,
            theme: DEFAULT_USER_PREFERENCES.theme,
            updatedAt: null,
          },
    });
  });

  app.put('/me/preferences', async (context) => {
    const parsedBody = preferencesUpdateSchema.safeParse(
      await context.req.json().catch(() => null),
    );

    if (!parsedBody.success) {
      return context.json(
        { error: 'invalid_preferences', message: '偏好设置格式不正确。' },
        400,
      );
    }

    const store = getAuthStore(context.env, dependencies.createStore);
    const authentication = await authenticateRequest(context, store, now());

    if (isAuthenticationResponse(authentication)) {
      return authentication;
    }

    const preferencesStore = getPreferencesStore(context.env, dependencies);
    const current = await preferencesStore.get(authentication.userId);
    const next = toStoredPreferences(
      authentication.userId,
      current,
      parsedBody.data,
      now(),
    );

    await preferencesStore.save(next);

    return context.json({
      preferences: {
        locale: next.locale,
        theme: next.theme,
        updatedAt: next.updatedAt,
      },
    });
  });
}
