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

export const DATA_PROVIDERS = ['bangumi', 'anilist'] as const;
export type DataProvider = (typeof DATA_PROVIDERS)[number];

export function normalizeCatalogTitle(value: string) {
  return value.trim().toLowerCase().replace(/[\s\u3000]+/g, '');
}

export function catalogTitlesMatch(left: string, right: string) {
  const a = normalizeCatalogTitle(left);
  const b = normalizeCatalogTitle(right);
  return a.length > 0 && a === b;
}

// AniList only has anime/manga equivalents. Music, games and most live-action
// subjects stay Bangumi-only rather than forcing a bad match.
export function anilistMediaTypeForSubject(
  subjectType: number,
): 'ANIME' | 'MANGA' | null {
  if (subjectType === 2) return 'ANIME';
  if (subjectType === 1) return 'MANGA';
  return null;
}
