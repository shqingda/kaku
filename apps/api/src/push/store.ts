import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

import { pushDevices } from '../db/schema.ts';

export type PushPlatform = 'android' | 'ios';

export type StoredPushDevice = {
  lastNotificationId: number | null;
  platform: PushPlatform;
  token: string;
  updatedAt: number;
  userId: number;
};

export type PushDeviceStore = {
  deleteByToken: (token: string) => Promise<void>;
  deleteByUser: (userId: number) => Promise<void>;
  listByUser: (userId: number) => Promise<StoredPushDevice[]>;
  listUserIds: () => Promise<number[]>;
  save: (input: StoredPushDevice) => Promise<void>;
  setLastNotificationId: (
    userId: number,
    lastNotificationId: number,
  ) => Promise<void>;
};

function mapRow(row: typeof pushDevices.$inferSelect): StoredPushDevice {
  return {
    lastNotificationId: row.lastNotificationId,
    platform: row.platform === 'android' ? 'android' : 'ios',
    token: row.token,
    updatedAt: row.updatedAt,
    userId: row.userId,
  };
}

export function createD1PushDeviceStore(database: D1Database): PushDeviceStore {
  const db = drizzle(database);

  return {
    async deleteByToken(token) {
      await db.delete(pushDevices).where(eq(pushDevices.token, token));
    },

    async deleteByUser(userId) {
      await db.delete(pushDevices).where(eq(pushDevices.userId, userId));
    },

    async listByUser(userId) {
      const rows = await db
        .select()
        .from(pushDevices)
        .where(eq(pushDevices.userId, userId));
      return rows.map(mapRow);
    },

    async listUserIds() {
      const rows = await db
        .select({ userId: pushDevices.userId })
        .from(pushDevices);
      return [...new Set(rows.map((row) => row.userId))];
    },

    async save(input) {
      await db
        .insert(pushDevices)
        .values({
          lastNotificationId: input.lastNotificationId,
          platform: input.platform,
          token: input.token,
          updatedAt: input.updatedAt,
          userId: input.userId,
        })
        .onConflictDoUpdate({
          set: {
            lastNotificationId: input.lastNotificationId,
            platform: input.platform,
            updatedAt: input.updatedAt,
            userId: input.userId,
          },
          target: pushDevices.token,
        });
    },

    async setLastNotificationId(userId, lastNotificationId) {
      await db
        .update(pushDevices)
        .set({ lastNotificationId })
        .where(eq(pushDevices.userId, userId));
    },
  };
}
