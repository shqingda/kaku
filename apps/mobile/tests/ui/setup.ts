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

// reanimated 加载需要 worklets babel 插件，jest 里整体替换为 no-op mock：
// 动画数值语义由真机上的 reanimated 保证，组件测试只断言交互契约
// （事件转发、函数式 style 解算、渲染几何）。
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  const passthrough = (Component: unknown) =>
    React.forwardRef((props: unknown, ref: unknown) =>
      React.createElement(Component, { ...(props as object), ref }),
    );

  return {
    __esModule: true,
    default: { createAnimatedComponent: passthrough, View },
    Animated: { createAnimatedComponent: passthrough, View },
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    withSpring: (
      toValue: number,
      _config: unknown,
      callback?: (finished: boolean) => void,
    ) => {
      callback?.(true);
      return toValue;
    },
    withTiming: (
      toValue: number,
      _config: unknown,
      callback?: (finished: boolean) => void,
    ) => {
      callback?.(true);
      return toValue;
    },
    withDecay: (
      _config: unknown,
      callback?: (finished: boolean) => void,
    ) => {
      callback?.(true);
      return 0;
    },
    withRepeat: () => 0,
    cancelAnimation: () => {},
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    Easing: {
      bezier: () => (x: number) => x,
      cubic: () => (x: number) => x,
      linear: () => (x: number) => x,
      in: (e: (x: number) => number) => e,
      out: (e: (x: number) => number) => e,
      inOut: (e: (x: number) => number) => e,
    },
  };
});

export {};
