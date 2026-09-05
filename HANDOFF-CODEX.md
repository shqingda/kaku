# Codex 交接：回复草稿、收藏搜索与 Android 发版

日期：2026-09-05。

## 当前状态

- 分支：`main`。
- 首页快捷记录进度已取消，代码和入口均已移除，不要恢复。
- 回复草稿已完成；仅覆盖共用讨论回复框的新回复和回复他人。
- 自己的收藏已支持完整收藏搜索、媒体类型和收藏状态筛选。
- 收藏固定按 `updatedAt` 从新到旧排列，没有排序开关。
- 生产 `/me/collections` 已可访问：未登录返回 401；iOS 登录态实测能逐页读取 699 项。
- App 版本仍为 `1.1.4`，本轮尚未构建或发布安装包。

## 最近提交

- `77290d5`：避免关闭的回复框在后台写回旧草稿，并修复晚到清理竞争。
- `a0a08cb`：让收藏离线、分页不一致和偏好存储失败状态可操作。
- `7b947f8`：归档交接后的测试和设备观察。

完整功能提交历史从 `8828176` 到 `7b947f8`，均已推送到 `origin/main`。

## 验证结果

- `pnpm typecheck`：通过。
- `pnpm test`：shared 3 项、mobile 358 项、API 286 项通过。
- 移动端 Jest：18 个 suite、89 项通过。
- iOS 26.5 模拟器确认：首页无快捷进度；自己的收藏页保留原外观；加载过程显示 `N/699`，完成后显示 699 项；没有排序开关。
- Argent 的搜索框点击/输入没有稳定落入输入框，因此搜索输入、清空和返回位置仍不能记为设备通过。
- Android 没有设备或 AVD；最终 APK、Maestro、权限、Sentry、登录和覆盖安装均未实跑。

详见 `docs/test-records/2026-09-05-handoff-followup.md` 和 `TODO.md`。

## GitHub 日常包发版

发版前必须有一台 arm64 Android 测试设备，并保持工作区干净。

1. 将 `apps/mobile/app.config.js` 版本从 `1.1.4` 提升到 `1.1.5`。
2. 用英文更新 `scripts/release-notes.md`。
3. 运行 `node scripts/sync-changelog.mjs`，检查 diff，运行相关检查，提交并推送。
4. 运行 `bash scripts/build-split-apks.sh v1.1.5 release --build-only`。
5. 运行 `node scripts/android-release.mjs verify apps/mobile/dist-split/kaku-release.apk DEVICE_SERIAL`。
6. 补齐 acceptance JSON 中 signedOut、signedIn、keyboardAndBack、permissions、oauthAndDeepLinks、sentry、upgrade 的真实 `passed` 状态和证据。不能把 Maestro 的条件跳过当作通过。
7. 确认 APK 哈希、源码提交和证书未变化后，运行 `node scripts/android-release.mjs publish apps/mobile/dist-split/kaku-release.apk`。

发布命令会推送当前 HEAD 并创建 `v1.1.5` GitHub Release。构建产物为 arm64-v8a、debug 签名；能否覆盖旧包取决于签名和实测结果。不要自动卸载用户应用。

所有 push、GitHub Release 和 EAS 操作前，解除代理环境变量。完整流程以 `RELEASE.md` 为准。

## 不要误做

- 不要直接运行不带 `--build-only` 的构建命令来绕过验收；门禁会拒绝未验收产物。
- 不要重新构建后发布；必须发布验收过的同一 APK。
- 不要把本地 debug 签名 APK 用于 Google Play；Play 使用 EAS `production` AAB。
- 不要恢复首页快捷进度、排序开关、Widget 或上游阻塞功能。
- 不要在没有 Android 设备证据时把本轮标为可发布。
