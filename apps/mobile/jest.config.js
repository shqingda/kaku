module.exports = {
  preset: 'jest-expo',
  // 纯逻辑测试仍走 node:test（tests/*.test.mjs）；这里只跑组件/hook 测试（.ts/.tsx）。
  testMatch: ['<rootDir>/tests/**/*.test.@(ts|tsx)'],
  setupFilesAfterEnv: ['<rootDir>/tests/ui/setup.ts'],
  moduleNameMapper: {
    '^@/assets/(.*)': '<rootDir>/assets/$1',
    '^@/(.*)': '<rootDir>/src/$1',
  },
};
