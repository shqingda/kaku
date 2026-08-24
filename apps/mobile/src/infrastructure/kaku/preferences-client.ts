import { z } from 'zod';

import type {
  CloudPreferences,
  ThemePreference,
} from '@/features/preferences/preferences-model';

import {
  KakuApiError,
  readErrorMessage,
} from './auth-client';

const cloudPreferencesSchema = z.object({
  preferences: z.object({
    locale: z.enum(['system', 'zh', 'en']),
    theme: z.enum(['system', 'light', 'dark']),
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
