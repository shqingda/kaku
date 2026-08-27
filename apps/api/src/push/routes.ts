import type { Hono } from 'hono';
import { z } from 'zod';

import type { AuthDependencies } from '../auth/routes.ts';
import { authenticateContext } from '../auth/route-helpers.ts';
import { isAuthenticationResponse } from '../auth/session-service.ts';
import type { Env } from '../env.ts';

import {
  createD1PushDeviceStore,
  type PushDeviceStore,
  type PushPlatform,
} from './store.ts';

const EXPO_PUSH_TOKEN = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;

const registerSchema = z.object({
  platform: z.enum(['android', 'ios']),
  token: z.string().regex(EXPO_PUSH_TOKEN),
});

export type PushDeviceDependencies = {
  createPushDeviceStore?: (database: D1Database) => PushDeviceStore;
};

function getStore(
  env: Env,
  dependencies: PushDeviceDependencies,
): PushDeviceStore {
  return dependencies.createPushDeviceStore
    ? dependencies.createPushDeviceStore(env.DB)
    : createD1PushDeviceStore(env.DB);
}

export function registerPushRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies & PushDeviceDependencies = {},
) {
  const now = dependencies.now ?? Date.now;

  app.put('/me/push-devices', async (context) => {
    const body = registerSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!body.success) {
      return context.json(
        { error: 'invalid_push_device', message: '推送设备格式不正确。' },
        400,
      );
    }

    const { authentication } = await authenticateContext(
      context,
      dependencies.createStore,
      now,
    );
    if (isAuthenticationResponse(authentication)) return authentication;

    const store = getStore(context.env, dependencies);
    const existing = (await store.listByUser(authentication.userId)).find(
      (device) => device.token === body.data.token,
    );
    const updatedAt = now();
    await store.save({
      lastNotificationId: existing?.lastNotificationId ?? null,
      platform: body.data.platform as PushPlatform,
      token: body.data.token,
      updatedAt,
      userId: authentication.userId,
    });

    return context.json({
      device: {
        platform: body.data.platform,
        token: body.data.token,
        updatedAt,
      },
    });
  });

  app.delete('/me/push-devices', async (context) => {
    const { authentication } = await authenticateContext(
      context,
      dependencies.createStore,
      now,
    );
    if (isAuthenticationResponse(authentication)) return authentication;

    await getStore(context.env, dependencies).deleteByUser(
      authentication.userId,
    );
    return context.json({ ok: true });
  });
}
