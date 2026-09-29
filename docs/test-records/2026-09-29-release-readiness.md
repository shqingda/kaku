# v1.1.12 发布验收

日期：2026-09-29。按用户要求推送并发布 Android GitHub 日常包。

## 自动化与构建

- `pnpm typecheck`：所有工作区通过。
- `pnpm test`：662 条通过（shared 3、mobile 369、API 290）。
- 更新交互修正后的完整 UI 回归：49 组、200 条通过。
- `bash scripts/build-split-apks.sh v1.1.12 release --build-only` 成功，包含新增的原生安装器模块。
- APK ZIP 完整性与 `apksigner verify` 通过；包名 `com.shqingda.kaku`、versionName `1.1.12`、versionCode `1`、ABI `arm64-v8a`。
- APK 内配置为 GitHub 更新渠道，包含 `REQUEST_INSTALL_PACKAGES` 权限。
- 下载 GitHub 已发布的 v1.1.11 APK 比对，签名 SHA-256 一致；未以此替代实机覆盖安装。

## 发布结果

- 发布源码：`9c1d76be818fe777ecb88938f99dd55079cb22cc`，已推送 `origin/main`。
- [GitHub v1.1.12](https://github.com/shqingda/kaku/releases/tag/v1.1.12) 已正式发布，非草稿、非预发布。
- 附件 `kaku-release.apk`：61,292,883 字节；GitHub 状态为 `uploaded`。
- 本机与 GitHub 附件 SHA-256 一致：`b36606d12d816046e3e610f6b4caace9ae567e7caaad8782849c0b5ef7cb0c43`。

## 限制

本次发布 Android GitHub APK，未发布 iOS / Google Play 商店版本，未重新部署 API。Android 实机尚未连接，冷启动、应用内下载取消、未知来源授权、覆盖安装与失败返回仍待实测。iOS 未配置正式 App Store ID。其余体验改进的实机边界继续见 TODO 和各专项测试记录。
