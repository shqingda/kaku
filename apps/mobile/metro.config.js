const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
// 原生客户端没有启用网页会话回放；使用 SDK 官方裁剪，保留错误和性能上报。
const config = getSentryExpoConfig(projectRoot, { includeWebReplay: false });

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
