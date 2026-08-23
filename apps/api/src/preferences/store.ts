import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

import { userPreferences } from '../db/schema.ts';

export type UserPreferences = {
  locale: 'system' | 'zh' | 'en';
  theme: 'system' | 'light' | 'dark';
  updatedAt: number;
  userId: number;
};

export type PreferencesStore = {
  get: (userId: number) => Promise<UserPreferences | null>;
  save: (input: UserPreferences) => Promise<void>;
};

export const DEFAULT_USER_PREFERENCES = {
  locale: 'system',
  theme: 'system',
} as const;

export function createD1PreferencesStore(
  database: D1Database,
): PreferencesStore {
  const db = drizzle(database);

  return {
    async get(userId) {
      const [row] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);

      if (!row) {
        return null;
      }

      return {
        locale: row.locale as UserPreferences['locale'],
        theme: row.theme as UserPreferences['theme'],
        updatedAt: row.updatedAt,
        userId: row.userId,
      };
    },

    async save(input) {
      await db
        .insert(userPreferences)
        .values(input)
        .onConflictDoUpdate({
          set: {
            locale: input.locale,
            theme: input.theme,
            updatedAt: input.updatedAt,
          },
          target: userPreferences.userId,
        });
    },
  };
}
