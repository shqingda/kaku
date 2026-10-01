# 2026-10-01 iOS 开发客户端闪退修复

环境：Xcode 27.0、iPhone 18 Pro 模拟器、iOS 27.0、Expo SDK 57。

## 问题与修复

`simctl openurl` 打开 Metro 开发链接超时，退出码 60。两个原生崩溃记录
显示 `ExpoFabricView.swift` 断言失败：`The app context has been lost`。
Metro 的状态接口正常，模拟器中仍是 1.1.6 开发客户端，其 Pods 锁定
Expo 57.0.24，与更新后的 JavaScript 依赖不一致。

此前自定义 SceneDelegate 先用空 launchOptions 启动 React Native，再转发
开发链接；插件检测到上游已有场景实现后又会直接跳过，没有开启官方入口。
改为 `expo-build-properties` 的 `ios.enableSceneSupport: true`，移除临时插件。
SDK 57 的配置要求见 [Expo 官方说明](https://docs.expo.dev/versions/v57.0.0/sdk/build-properties/)。

重新 prebuild、安装 Pods、编译并覆盖安装模拟器开发客户端。生成的场景入口
为 `EXExpoAppSceneDelegate`。保留已有应用数据与登录态。重启原有 Metro，
清除旧插件配置缓存，恢复 8081 服务。首次无签名构建出现钥匙串授权错误，
随后使用 Xcode 正常模拟器签名重建，错误消失。

## 验证

- 原生 Debug 模拟器构建成功，已安装版本为 1.1.12。
- 原始局域网开发链接连续 3 次冷启动成功，均进入首页；没有新增 Kaku
  崩溃报告，系统日志没有新的 AppContextLost 或 Fatal error。
- `pnpm test:smoke` 完整通过：localhost 链接热重载、首页、账户、更新日志
  展开与网络诊断；没有修改远端数据。
- 移动端类型检查、Expo 依赖兼容检查通过；expo-doctor 21/21 通过。
- 移动端组件测试 49 组、200 条通过；pnpm 11 冻结锁文件检查通过。

范围：验收了本机 iOS 模拟器开发客户端，未验证真机或生产构建。
构建与日志留在本机 `/tmp/kaku-ios-recovery.qO33qv/`，截图未提交。
