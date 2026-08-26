import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

import {
  DEFAULT_PREFERENCE_VALUES,
  type LocalePreference,
  type ThemePreference,
} from '@kaku/shared';

import { userPreferences } from '../db/schema.ts';

export type UserPreferences = {
  locale: LocalePreference;
  theme: ThemePreference;
  updatedAt: number;
  userId: number;
};

export type PreferencesStore = {
  get: (userId: number) => Promise<UserPreferences | null>;
  save: (input: UserPreferences) => Promise<void>;
};

export const DEFAULT_USER_PREFERENCES = DEFAULT_PREFERENCE_VALUES;

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
        locale: row.locale as LocalePreference,
        theme: row.theme as ThemePreference,
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
