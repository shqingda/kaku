import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

import { isRecentSubject, type RecentSubject } from '@kaku/shared/recent-subjects-contract';

import { userRecentSubjects } from '../db/schema.ts';

type StoredRecentSubjects = {
  items: RecentSubject[];
  updatedAt: number;
  userId: number;
};

export type RecentSubjectsStore = {
  get: (userId: number) => Promise<StoredRecentSubjects | null>;
  save: (input: StoredRecentSubjects) => Promise<void>;
};

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
      if (!Array.isArray(parsed) || !parsed.every(isRecentSubject)) {
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
