import { and, eq, gt, lte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

import { bangumiCredentials, pushDevices, pushReceipts, sessions } from '../db/schema.ts';

type PushPlatform = 'android' | 'ios';

export type StoredPushDevice = {
  provider?: 'fcm' | 'apns' | 'expo';
  apnsEnvironment?: 'sandbox' | 'production' | null;
  apnsTopic?: string | null;
  lastNotificationId: number | null;
  platform: PushPlatform;
  registrationId: string | null;
  sessionId: string | null;
  token: string;
  updatedAt: number;
  userId: number;
};

type PushDeliveryCommit = {
  devices: StoredPushDevice[];
  lastNotificationId: number;
};

export type PushDeviceStore = {
  commitDelivery: (input: PushDeliveryCommit) => Promise<void>;
  deleteByUserAndToken: (userId: number, sessionId: string, token: string) => Promise<void>;
  deleteExpiredReceipts: (now: number) => Promise<number>;
  deleteRegistration: (snapshot: StoredPushDevice) => Promise<void>;
  listByUser: (userId: number, now: number) => Promise<StoredPushDevice[]>;
  listUserIds: (now: number) => Promise<number[]>;
  save: (input: StoredPushDevice & { registrationId: string; sessionId: string }) => Promise<boolean>;
};

function mapRow(row: typeof pushDevices.$inferSelect): StoredPushDevice {
  return { ...row, platform: row.platform === 'android' ? 'android' : 'ios',
    provider: row.provider === 'fcm' ? 'fcm' : row.provider === 'apns' ? 'apns' : 'expo',
    apnsEnvironment: row.apnsEnvironment === 'sandbox' ? 'sandbox' : row.apnsEnvironment === 'production' ? 'production' : null,
  };
}

export function createD1PushDeviceStore(database: D1Database): PushDeviceStore {
  const db = drizzle(database);
  const activeSession = (now: number) => and(
    eq(sessions.sessionId, pushDevices.sessionId),
    eq(sessions.userId, pushDevices.userId),
    gt(sessions.refreshExpiresAt, now),
  );

  return {
    async deleteByUserAndToken(userId, sessionId, token) {
      await db.delete(pushDevices).where(and(
        eq(pushDevices.userId, userId), eq(pushDevices.sessionId, sessionId), eq(pushDevices.token, token),
      ));
    },

    async deleteRegistration(snapshot) {
      if (!snapshot.registrationId || !snapshot.sessionId) return;
      await db.delete(pushDevices).where(and(
        eq(pushDevices.token, snapshot.token), eq(pushDevices.userId, snapshot.userId),
        eq(pushDevices.sessionId, snapshot.sessionId), eq(pushDevices.registrationId, snapshot.registrationId),
      ));
    },

    async listByUser(userId, now) {
      const rows = await db.select({ device: pushDevices }).from(pushDevices)
        .innerJoin(sessions, activeSession(now))
        .innerJoin(bangumiCredentials, eq(bangumiCredentials.userId, pushDevices.userId))
        .where(eq(pushDevices.userId, userId));
      return rows.map(({ device }) => mapRow(device));
    },

    async listUserIds(now) {
      const rows = await db.selectDistinct({ userId: pushDevices.userId }).from(pushDevices)
        .innerJoin(sessions, activeSession(now))
        .innerJoin(bangumiCredentials, eq(bangumiCredentials.userId, pushDevices.userId));
      return rows.map((row) => row.userId);
    },

    async save(input) {
      // The session may have been revoked after request authentication. A single
      // conditional statement cannot recreate that device after revocation.
      const result = await database.prepare(`
        INSERT INTO push_devices (last_notification_id, platform, registration_id, session_id, token, updated_at, user_id, provider, apns_environment, apns_topic)
        SELECT ?, ?, ?, session_id, ?, ?, user_id, ?, ?, ? FROM sessions
        WHERE session_id = ? AND user_id = ? AND refresh_expires_at > ?
          AND EXISTS (SELECT 1 FROM bangumi_credentials WHERE user_id = sessions.user_id)
        ON CONFLICT(token) DO UPDATE SET
          last_notification_id = CASE
            WHEN push_devices.user_id = excluded.user_id AND push_devices.session_id = excluded.session_id
              AND push_devices.provider = excluded.provider
              AND push_devices.apns_environment IS excluded.apns_environment AND push_devices.apns_topic IS excluded.apns_topic
            THEN CASE
              WHEN push_devices.last_notification_id IS NULL AND excluded.last_notification_id IS NULL THEN NULL
              ELSE MAX(COALESCE(push_devices.last_notification_id, 0), COALESCE(excluded.last_notification_id, 0))
            END
            ELSE NULL
          END,
          provider = excluded.provider, apns_environment = excluded.apns_environment, apns_topic = excluded.apns_topic,
          platform = excluded.platform,
          registration_id = excluded.registration_id, session_id = excluded.session_id,
          updated_at = excluded.updated_at, user_id = excluded.user_id
        RETURNING token
      `).bind(input.lastNotificationId, input.platform, input.registrationId, input.token,
        input.updatedAt, input.provider ?? 'expo', input.apnsEnvironment ?? null, input.apnsTopic ?? null, input.sessionId, input.userId, input.updatedAt).all();
      return result.results.length > 0;
    },

    async commitDelivery({ devices, lastNotificationId }) {
      const statements: D1PreparedStatement[] = [];
      for (const device of devices) {
        if (!device.sessionId || !device.registrationId) continue;
        statements.push(database.prepare(`
          UPDATE push_devices SET last_notification_id = MAX(COALESCE(last_notification_id, 0), ?)
          WHERE token = ? AND user_id = ? AND session_id = ? AND registration_id = ?
        `).bind(lastNotificationId, device.token, device.userId, device.sessionId, device.registrationId));
      }
      // Commit every accepted device's cursor atomically; never advance only
      // part of a batch if a later update fails.
      if (statements.length > 0) await database.batch(statements);
    },

    async deleteExpiredReceipts(now) {
      const deleted = await db.delete(pushReceipts)
        .where(lte(pushReceipts.createdAt, now - 24 * 60 * 60_000))
        .returning({ ticketId: pushReceipts.ticketId });
      return deleted.length;
    },
  };
}
