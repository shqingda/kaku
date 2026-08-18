import * as Sentry from '@sentry/react-native';

// 崩溃监控：DSN 未设置时跳过初始化，避免本地开发依赖未装原生模块而报错。
// 发布构建前在 EAS Secret 里设置 EXPO_PUBLIC_SENTRY_DSN 即可启用。
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // 个人项目：线上采样 20%，减少配额与开销。
    tracesSampleRate: 0.2,
    environment:
      process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ??
      (process.env.EAS_BUILD_PROFILE ?? 'development'),
  });
}

export default Sentry;
