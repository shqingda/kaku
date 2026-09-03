import { z } from 'zod';

import {
  LOCALE_PREFERENCES,
  THEME_PREFERENCES,
  type ThemePreference,
} from '@kaku/shared';

import type { CloudPreferences } from '@/features/preferences/preferences-model';

import {
  KakuApiError,
  readErrorMessage,
} from './auth-client.ts';

const cloudPreferencesSchema = z.object({
  preferences: z.object({
    locale: z.enum(LOCALE_PREFERENCES),
    theme: z.enum(THEME_PREFERENCES),
    updatedAt: z.number().int().positive().nullable(),
  }),
});

export async function parseCloudPreferences(
  response: Response,
): Promise<CloudPreferences> {
  if (!response.ok) {
    throw new KakuApiError(await readErrorMessage(response), response.status);
  }

  const parsed = cloudPreferencesSchema.parse(await response.json());

  return {
    locale: parsed.preferences.locale,
    theme: parsed.preferences.theme,
    updatedAt: parsed.preferences.updatedAt,
  };
}

export function buildPreferencesBody(theme: ThemePreference) {
  return JSON.stringify({ theme });
}
