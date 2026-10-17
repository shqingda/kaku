import type { Hono } from 'hono';
import { z } from 'zod';
import { pushRegistrationSchema, pushTokenSchema } from '@kaku/shared/push-contract';

import type { AuthDependencies } from '../auth/routes.ts';
import { authenticateContext } from '../auth/route-helpers.ts';
import { isAuthenticationResponse } from '../auth/session-service.ts';
import type { Env } from '../env.ts';

import {
  createD1PushDeviceStore,
  type PushDeviceStore,
} from './store.ts';

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
    const input: unknown = await context.req.json().catch(() => null);
    const legacy = z.object({ platform: z.enum(['android', 'ios']), token: z.string().regex(/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/) }).safeParse(input);
    if (legacy.success && !(input && typeof input === 'object' && 'provider' in input)) {
      const { authentication } = await authenticateContext(context, dependencies.createStore, now);
      if (isAuthenticationResponse(authentication)) return authentication;
      return context.json({ error: 'push_client_upgrade_required', message: '请更新 Kaku 后重新打开推送通知。' }, 426);
    }
    const body = pushRegistrationSchema.safeParse(input);
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

    const configured = body.data.provider === 'fcm' ? Boolean(context.env.FCM_SERVICE_ACCOUNT_JSON)
      : Boolean(context.env.APNS_KEY_ID && context.env.APNS_TEAM_ID && context.env.APNS_PRIVATE_KEY);
    if (!configured) return context.json({ error: 'push_provider_not_configured', message: '推送服务尚未配置完成，请稍后重试。' }, 503);

    const store = getStore(context.env, dependencies);
    const existing = (await store.listByUser(authentication.userId, now())).find(
      (device) => device.token === body.data.token,
    );
    const updatedAt = now();
    const saved = await store.save({
      lastNotificationId: existing?.sessionId === authentication.sessionId ? existing.lastNotificationId : null,
      registrationId: crypto.randomUUID(),
      sessionId: authentication.sessionId,
      provider: body.data.provider,
      apnsEnvironment: body.data.provider === 'apns' ? body.data.apnsEnvironment : null,
      apnsTopic: body.data.provider === 'apns' ? body.data.apnsTopic : null,
      platform: body.data.platform,
      token: body.data.token,
      updatedAt,
      userId: authentication.userId,
    });

    if (!saved) return context.json({ error: 'invalid_session', message: '登录会话已失效，请重新登录。' }, 401);

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

    const body = z.object({ token: pushTokenSchema }).safeParse(
      await context.req.json().catch(() => null),
    );
    if (!body.success) {
      return context.json({ error: 'invalid_push_device', message: '请指定本机推送设备。' }, 400);
    }

    await getStore(context.env, dependencies).deleteByUserAndToken(
      authentication.userId,
      authentication.sessionId,
      body.data.token,
    );
    return context.json({ ok: true });
  });
}
