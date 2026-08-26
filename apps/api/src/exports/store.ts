import { and, eq, lt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

import { userExports } from '../db/schema.ts';

export const EXPORT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_EXPORTS_PER_USER = 5;
export const MAX_EXPORT_BYTES = 800_000;

export type UserExportFormat = 'json' | 'csv';

export type UserExportRecord = {
  byteSize: number;
  createdAt: number;
  expiresAt: number;
  format: UserExportFormat;
  id: string;
  objectKey: string;
  userId: number;
};

export type ExportObjectStore = Pick<R2Bucket, 'delete' | 'get' | 'put'>;

export type ExportStore = {
  create: (input: {
    body: string;
    format: UserExportFormat;
    id: string;
    now: number;
    userId: number;
  }) => Promise<UserExportRecord>;
  delete: (userId: number, id: string) => Promise<boolean>;
  deleteExpired: (now: number) => Promise<number>;
  get: (
    userId: number,
    id: string,
  ) => Promise<{ body: string; record: UserExportRecord } | null>;
  list: (userId: number) => Promise<UserExportRecord[]>;
};

function objectKey(userId: number, id: string, format: UserExportFormat) {
  return `exports/${userId}/${id}.${format}`;
}

function toRecord(row: typeof userExports.$inferSelect): UserExportRecord {
  return {
    byteSize: row.byteSize,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    format: row.format === 'csv' ? 'csv' : 'json',
    id: row.id,
    objectKey: row.objectKey,
    userId: row.userId,
  };
}

export function createExportStore(
  database: D1Database,
  bucket: ExportObjectStore,
): ExportStore {
  const db = drizzle(database);

  return {
    async create({ body, format, id, now, userId }) {
      const byteSize = new TextEncoder().encode(body).byteLength;
      const record: UserExportRecord = {
        byteSize,
        createdAt: now,
        expiresAt: now + EXPORT_TTL_MS,
        format,
        id,
        objectKey: objectKey(userId, id, format),
        userId,
      };

      await bucket.put(record.objectKey, body, {
        customMetadata: {
          expiresAt: String(record.expiresAt),
          format,
          userId: String(userId),
        },
        httpMetadata: {
          contentType: format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json',
        },
      });

      await db.insert(userExports).values(record);

      const existing = await db
        .select()
        .from(userExports)
        .where(eq(userExports.userId, userId));
      const extra = existing
        .sort((left, right) => right.createdAt - left.createdAt)
        .slice(MAX_EXPORTS_PER_USER);

      for (const row of extra) {
        await bucket.delete(row.objectKey);
        await db.delete(userExports).where(eq(userExports.id, row.id));
      }

      return record;
    },

    async delete(userId, id) {
      const [row] = await db
        .select()
        .from(userExports)
        .where(and(eq(userExports.id, id), eq(userExports.userId, userId)))
        .limit(1);
      if (!row) return false;

      await bucket.delete(row.objectKey);
      await db.delete(userExports).where(eq(userExports.id, id));
      return true;
    },

    async deleteExpired(now) {
      const expired = await db
        .select()
        .from(userExports)
        .where(lt(userExports.expiresAt, now));
      for (const row of expired) {
        await bucket.delete(row.objectKey);
        await db.delete(userExports).where(eq(userExports.id, row.id));
      }
      return expired.length;
    },

    async get(userId, id) {
      const [row] = await db
        .select()
        .from(userExports)
        .where(and(eq(userExports.id, id), eq(userExports.userId, userId)))
        .limit(1);
      if (!row) return null;

      const object = await bucket.get(row.objectKey);
      if (!object) return null;

      return { body: await object.text(), record: toRecord(row) };
    },

    async list(userId) {
      const rows = await db
        .select()
        .from(userExports)
        .where(eq(userExports.userId, userId));
      return rows
        .map(toRecord)
        .sort((left, right) => right.createdAt - left.createdAt);
    },
  };
}
