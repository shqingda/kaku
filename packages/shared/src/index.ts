export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export const LOCALE_PREFERENCES = ['system', 'zh', 'en'] as const;
export const COLLECTION_STATUSES = [
  'wish',
  'completed',
  'doing',
  'onHold',
  'dropped',
] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type LocalePreference = (typeof LOCALE_PREFERENCES)[number];
export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];

export const DEFAULT_PREFERENCE_VALUES = {
  locale: 'system',
  theme: 'system',
} as const satisfies {
  locale: LocalePreference;
  theme: ThemePreference;
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === 'string' &&
    (THEME_PREFERENCES as readonly string[]).includes(value)
  );
}

export function isLocalePreference(value: unknown): value is LocalePreference {
  return (
    typeof value === 'string' &&
    (LOCALE_PREFERENCES as readonly string[]).includes(value)
  );
}

export function isCollectionStatus(value: unknown): value is CollectionStatus {
  return (
    typeof value === 'string' &&
    (COLLECTION_STATUSES as readonly string[]).includes(value)
  );
}
