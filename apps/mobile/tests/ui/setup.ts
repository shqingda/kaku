// 组件测试的统一环境。
// ThemeProvider 依赖 PreferencesProvider，而后者要拉起本地存储与云端同步，
// 组件测试里用固定的默认偏好替身即可；需要其它偏好字段时在测试文件里覆盖。
jest.mock('@/features/preferences/preferences-provider', () => {
  const { DEFAULT_APP_PREFERENCES } = require('@/features/preferences/preferences-model');

  return {
    usePreferences: () => ({ preferences: DEFAULT_APP_PREFERENCES }),
  };
});

// 触觉在测试环境没有意义，全部替换为 no-op。
jest.mock('@/lib/haptics', () => ({
  playSelectionHaptic: jest.fn().mockResolvedValue(undefined),
  playEpisodeToggleHaptic: jest.fn().mockResolvedValue(undefined),
  playSuccessHaptic: jest.fn().mockResolvedValue(undefined),
}));

export {};
