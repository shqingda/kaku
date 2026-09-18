# v1.1.8 发布验收

日期：2026-09-18 开始，2026-09-19 完成发布验证。Android 实机按用户要求暂缓；模拟器为 iPhone 18 Pro / iOS 27.0，使用已有 dev client + 当前 Metro JS。

## 自动化

- `pnpm test`：658 条通过（shared 3、mobile 365、API 290）。
- `pnpm test:ui --runInBand`：28 套件、130 条通过。
- `pnpm typecheck`：所有工作区通过。
- `pnpm test:performance`：2 条通过；这是检查脚本的测试，不是新性能采样。
- API 覆盖率 92.74%，移动端 Node 测试覆盖率 94.59%，均通过仓库门槛。
- Expo SDK 57 补丁依赖更新后，`expo install --check`、expo-doctor 21/21 与 iOS/Android JS 导出通过。
- `pnpm build:web` 通过。

路由集成使用真实 Expo Router，详情页使用参数探针，登录面板与无效链接页使用实际组件；不覆盖真实 OAuth 浏览器。通知组件使用真实 QueryClient/onlineManager，替换 HTTP 与原生行导航，覆盖离线卸载/重挂/恢复、筛选、失败回滚及缓存重试。首页收藏区、条目评论区和收藏盒补 3 条行为测试；不声称覆盖所有整屏交互组合。

## iOS 与素材

- `.maestro/kaku-regression-ios.yaml` 全量通过。修复更新日志 1.1.1 卡片滚出屏幕后直接点击的脆弱选择器。
- `.maestro/store-screenshots-ios.yaml` 通过，6 类截图已在本机采集；商店素材说明见 `../store/listing.md`。开发控件及真实账号内容使这批素材只适合作候选参考，不会上传。
- 大字体专项检查中发现冒烟登录分支依赖入口可见性，已修正为先滚入视野并先处理未登录入口；accessibility-large 复跑通过，已检查首页截图无重叠，随后恢复系统 large。证据目录 `~/.maestro/tests/2026-09-18_235550/`。
- 上述全量初次通过发生在 Expo 补丁更新之前；补丁更新后已重启 Metro；第一轮复验在章节流程误点搜索输入框，截图确认未离开搜索页。已把 7 个流程的结果点击限定在“搜索结果”标题下方，随后补跑前 12 个顶层流程通过，最后收藏盒转场期间的一次点击未生效。补上 `waitForAnimationToEnd` 后，收藏盒独立连续两轮通过。整套证据目录 `~/.maestro/tests/2026-09-19_000148/`，收藏盒两轮证据 `~/.maestro/tests/2026-09-19_000651/`；最后这轮整套记录仍为失败，不记作一次无失败全量。已有 iOS 原生 dev client 不是新 production 构建。

## 发布与限制

- D1 远端 `migrations list`：无待迁移；不修改 schema。
- API 已先部署：Worker 版本 `70d0d905-a6fd-4f57-8005-b7ac99a65509`。无代理 curl 验证 `/health`、`/config` 返回 200，`/auth/sessions`、`/me/timeline` 无登录返回 401。Python urllib 首次探测返回 403，与 curl 结果不同，未据此更改服务。
- APK 已构建：61,144,385 字节，包名 `com.shqingda.kaku`，versionName `1.1.8`，versionCode `1`，仅 arm64-v8a；minSdk 24、targetSdk 36。Sentry DSN 已确认嵌入，但未模拟真实崩溃上报。
- APK SHA-256：`02387fc6504d7c33e54256fdd369258b63bdc97ae6fa71cb1b6e7e13b7bff604`。
- 新包与 GitHub `v1.1.7` 下载包的签名 SHA-256 均为 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`；签名校验通过。未实机覆盖安装。
- 发布源码提交：`ed974a5`；GitHub CI `35365708186` 全部通过。[GitHub v1.1.8](https://github.com/shqingda/kaku/releases/tag/v1.1.8) 已于 2026-09-19 发布，非草稿；远端 APK 大小与 SHA-256 与本地一致。
- 双真机推送、Android APK 冷启动/Sentry/覆盖安装、真实多账号授权、VoiceOver 实际读屏与新 React profiler 采样尚未完成；TODO 保留原因。
