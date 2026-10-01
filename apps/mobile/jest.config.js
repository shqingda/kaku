module.exports = {
  preset: 'jest-expo',
  // 纯逻辑测试仍走 node:test（tests/*.test.mjs）；这里只跑组件/hook 测试（.ts/.tsx）。
  testMatch: ['<rootDir>/tests/**/*.test.@(ts|tsx)'],
  setupFilesAfterEnv: ['<rootDir>/tests/ui/setup.ts'],
  moduleNameMapper: {
    // 官网使用 React 19.3；移动端测试及原生 mock 统一使用本应用的 React 实例。
    '^react$': '<rootDir>/node_modules/react',
    '^react/(.*)$': '<rootDir>/node_modules/react/$1',
    '^@/assets/(.*)': '<rootDir>/assets/$1',
    '^@/(.*)': '<rootDir>/src/$1',
  },
};
