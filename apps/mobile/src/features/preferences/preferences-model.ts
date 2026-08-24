export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export const LOCAL_PREFERENCES = ['system', 'zh', 'en'] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type LocalePreference = (typeof LOCAL_PREFERENCES)[number];
export type ResolvedTheme = 'light' | 'dark';

export type AppPreferences = {
  theme: ThemePreference;
  // 本地偏好最后保存时刻（epoch ms）。null 表示从未在“本机”修改过。
  updatedAt: number | null;
  // 设备级隐私开关：是否允许在登录设备间同步偏好（不随云端同步本身）。
  syncEnabled: boolean;
};

export type CloudPreferences = {
  locale: LocalePreference;
  theme: ThemePreference;
  // 服务端最后保存时刻（epoch ms）。null 表示云端尚未保存过。
  updatedAt: number | null;
};

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  theme: 'system',
  updatedAt: null,
  syncEnabled: true,
};

export function parseAppPreferences(value: unknown): AppPreferences {
  if (!value || typeof value !== 'object') {
    return DEFAULT_APP_PREFERENCES;
  }

  const candidate = value as Partial<AppPreferences>;
  const theme = THEME_PREFERENCES.includes(candidate.theme as ThemePreference)
    ? (candidate.theme as ThemePreference)
    : DEFAULT_APP_PREFERENCES.theme;
  const updatedAt =
    typeof candidate.updatedAt === 'number' &&
    Number.isFinite(candidate.updatedAt) &&
    candidate.updatedAt > 0
      ? candidate.updatedAt
      : null;
  const syncEnabled =
    typeof candidate.syncEnabled === 'boolean'
      ? candidate.syncEnabled
      : DEFAULT_APP_PREFERENCES.syncEnabled;

  return { theme, updatedAt, syncEnabled };
}

export function resolveTheme(
  preference: ThemePreference,
  systemScheme:
    | 'dark'
    | 'light'
    | 'unspecified'
    | null
    | undefined,
): ResolvedTheme {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return systemScheme === 'dark' ? 'dark' : 'light';
}

export type MergeResult = {
  applied: AppPreferences;
  pushToCloud: boolean;
};

// 时间戳优先级策略：云端 updatedAt 更新 → 采用云端；否则保留本地并在需要时推送到云端。
// 手机时钟一般随系统自动校准，且两端都用服务端返回的时间戳回写本地，
// 因此正常路径下不会来回覆盖（local updatedAt 始终是服务端同一时钟的刻值）。
export function mergePreferences(
  local: AppPreferences,
  cloud: CloudPreferences | null,
): MergeResult {
  if (!cloud) {
    return { applied: local, pushToCloud: local.updatedAt !== null };
  }

  const cloudUpdatedAt = cloud.updatedAt;
  const cloudIsNewer =
    cloudUpdatedAt !== null &&
    (local.updatedAt === null || cloudUpdatedAt > local.updatedAt);

  if (cloudIsNewer) {
    return {
      applied: {
        theme: cloud.theme,
        updatedAt: cloudUpdatedAt,
        syncEnabled: local.syncEnabled,
      },
      pushToCloud: false,
    };
  }

  return { applied: local, pushToCloud: local.updatedAt !== cloudUpdatedAt };
}
