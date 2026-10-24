- 升级应用底层框架至 Expo SDK 58，配套更新 React Native 与原生组件。
- 更新数据请求与缓存依赖，修复部分状态更新问题。
- 修复多项构建与开发工具依赖安全问题，并补充签名校验回归测试。

安装说明：提供 arm64-v8a 正式版 kaku-release.apk，支持 Android 10 及以上。Android 13+ 使用正式签名及原签名轮换证明，Android 10–12L 沿用原签名。面向既有 GitHub 正式包覆盖更新，无需卸载或清理数据；其他来源签名不同的安装包不保证兼容。无需连接开发服务器。

构建说明：版本 1.1.22，Android versionCode 9，包名 com.shqingda.kaku；启用 R8 与资源裁剪。通过 GitHub 分发，未提交应用商店。

验证范围：升级提交已通过 GitHub CI 的类型检查、单元与组件测试、覆盖率、iOS/Android JS 打包及官网构建。Expo SDK 58 已通过指定 iOS 模拟器冒烟测试。Android 真机运行、连续覆盖安装和通知送达仍待实测。node-forge 已加本地安全补丁及回归测试，因官方尚未发布修复版，原始审计仍显示 1 项 high；另有 1 项 moderate，critical 为 0。
