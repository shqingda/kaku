import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

import { userRecentSubjects } from '../db/schema.ts';

type StoredRecentSubject = {
  coverUrl?: string;
  id: number;
  title: string;
  type: number;
  viewedAt: number;
};

type StoredRecentSubjects = {
  items: StoredRecentSubject[];
  updatedAt: number;
  userId: number;
};

export type RecentSubjectsStore = {
  get: (userId: number) => Promise<StoredRecentSubjects | null>;
  save: (input: StoredRecentSubjects) => Promise<void>;
};

function isStoredRecentSubject(value: unknown): value is StoredRecentSubject {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<StoredRecentSubject>;
  return (
    Number.isInteger(item.id) &&
    Number(item.id) > 0 &&
    typeof item.title === 'string' &&
    Boolean(item.title.trim()) &&
    Number.isInteger(item.type) &&
    typeof item.viewedAt === 'number' &&
    Number.isFinite(item.viewedAt) &&
    item.viewedAt >= 0 &&
    (item.coverUrl === undefined || typeof item.coverUrl === 'string')
  );
}

export function createD1RecentSubjectsStore(
  database: D1Database,
): RecentSubjectsStore {
  const db = drizzle(database);

  return {
    async get(userId) {
      const [row] = await db
        .select()
        .from(userRecentSubjects)
        .where(eq(userRecentSubjects.userId, userId))
        .limit(1);
      if (!row) return null;

      let parsed: unknown;
      try {
        parsed = JSON.parse(row.items);
      } catch {
        // JSON errors may contain history text; log only a controlled error.
        throw new Error('recent_subjects_parse_failed');
      }
      if (!Array.isArray(parsed) || !parsed.every(isStoredRecentSubject)) {
        // A partial or empty result could be mistaken for a newer cloud clear.
        throw new Error('recent_subjects_parse_failed');
      }

      return {
        items: parsed.slice(0, 10),
        updatedAt: row.updatedAt,
        userId: row.userId,
      };
    },

    async save(input) {
      await db
        .insert(userRecentSubjects)
        .values({
          items: JSON.stringify(input.items),
          updatedAt: input.updatedAt,
          userId: input.userId,
        })
        .onConflictDoUpdate({
          set: {
            items: JSON.stringify(input.items),
            updatedAt: input.updatedAt,
          },
          target: userRecentSubjects.userId,
        });
    },
  };
}
