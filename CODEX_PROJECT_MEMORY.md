# Kaku 项目记忆与迁移摘要

> 更新时间：2026-08-20。本文是供迁移后的仓库、OpenCode 或下一位维护者快速恢复上下文的项目记忆；只记录公开架构与操作约定，不含任何密钥、Token、真实用户数据或本机路径。

## 1. 产品定位

Kaku 是面向中文用户的 **Bangumi 第三方移动客户端**。目标不是简单套壳官网，而是保留 Bangumi 的数据与功能语义，并按移动端重新组织浏览、收藏、进度、评分与社区体验。

- 产品优先级：**iOS 优先**，同时保证 Android 真机可用；桌面端尚未开始，未来选 Electron，不选 Tauri。
- 设计方向：Apple Design 的留白、清晰层级、可预期导航、即时触感反馈、弹层的物理感和对弱网/失败的明确反馈。
- 工程方向：用 Expo/React Native 做产品，用 Cloudflare Worker 保护 OAuth 秘钥与代理 Bangumi 的内部客户端接口；业务层保持 provider-neutral，不把 Bangumi API 形状扩散到页面。
- 用户口径：用户说“提交 git”通常就是 **检查 → commit → push 到 `main`**，不要创建 PR，除非用户明确说要。

## 2. 仓库结构

```text
apps/
  mobile/  Expo Router + React Native 的 iOS / Android App
  api/     Cloudflare Worker + D1，登录、会话、写操作与 P1 代理
  web/     Kaku 产品官网
```

- 根目录使用 pnpm workspace。
- `apps/mobile/src/app/`：Expo Router 页面路由。
- `apps/mobile/src/features/`：按业务能力划分 UI、状态与交互。
- `apps/mobile/src/infrastructure/bangumi/`：Bangumi client / schema / adapter / provider；页面不要直接读 Bangumi 原始字段。
- `apps/mobile/src/constants/theme.ts`：移动端语义化颜色、间距、排版 token 的单一来源。
- `apps/api/`：Worker 路由与服务；改 API 后需要部署，手机 App 连接的是线上 Worker。
- `.maestro/`：端到端冒烟测试。
- `TODO.md`：上游缺口和临时隐藏功能，迁移时必须一并带走。
- `RELEASE.md`：Android 发版的唯一操作指南。

## 3. 技术栈与架构原则

### 移动端

- Expo SDK 57、Expo Router、React Native、TypeScript、React Compiler。
- TanStack Query：查询缓存、刷新、分页、弱网缓存降级。
- expo-sqlite：公开浏览缓存、本地诊断记录等持久化数据。
- expo-secure-store：保存 Kaku session，不保存 Bangumi OAuth token。
- expo-image、expo-haptics、Reanimated / Gesture Handler、SF Symbols（iOS）。

### 服务端

- Cloudflare Worker + Hono + D1。
- Bangumi OAuth + P1 / v0 API adapter。
- D1 保存加密的 Bangumi token、Kaku session、一次性交接码等最小必要数据。

### 三条不能破的边界

1. `client_secret` 与 Bangumi access/refresh token 只能留在 Worker；客户端永远拿不到。
2. OAuth 回到手机时只发放 60 秒、一次性的 handoff code；App 用它换取自己的 Kaku session。
3. 业务模型不能依赖 Bangumi 细节；Bangumi 仅是 provider/adaptor，未来可替换或增加数据源。

## 4. 登录与会话链路

```text
App 打开系统浏览器
→ Worker 创建并保存短时 state
→ Bangumi OAuth 登录/授权
→ Bangumi 回调 Worker（code + state）
→ Worker 校验 state、用 client_secret 换 Bangumi token、读取 /v0/me
→ Worker 保存加密 token，生成 60 秒 handoff code
→ kaku://auth/callback?code=... 回到 App
→ App POST /auth/session 换 Kaku session
→ SecureStore 保存 Kaku session 与用户信息
```

- Kaku session：1 小时 access + 90 天 refresh；refresh token 每次使用都轮换，数据库只存哈希。
- 已有能力：当前设备退出、其他设备撤销、断开 Bangumi 连接。
- `disconnect` 的含义是删掉 Kaku 持有的凭据和 sessions；Bangumi 没有公共 OAuth revoke API，远端 token 只能自然过期。
- 线上 Worker：`https://kaku-api.shqingda.workers.dev`。改 API 后必须运行 `pnpm --filter @kaku/api deploy:worker`。

## 5. 已完成的产品能力

### 公开浏览

- 首页、综合页、频道、分类浏览、排行榜、每日放送。
- 条目详情：动画、书籍、音乐、游戏、三次元；封面全屏查看与下载；相关条目、角色与声优、制作人员、章节、讨论、评论、吐槽箱等。
- 搜索、最近浏览、最近搜索、公开用户主页、好友主页、好友动态、日志、目录、小组、虚构角色与现实人物。
- 条目、讨论、公开用户页等网络失败时保留旧缓存，并以“缓存数据/稍后刷新”而不是白屏表现。

### 登录后的个人数据与写操作

- 收藏盒的想看/看过/在看/搁置/抛弃、评分，以及动画/三次元进度同步。
- 新建条目/小组话题。
- 条目话题、小组话题、单集吐槽、长评回复：新增、引用、编辑、删除。
- 好友添加/删除；屏蔽/取消屏蔽；举报用户、话题、回复。
- 目录：新建、编辑、删除、收藏。
- 好友动态发布。

### 稳定性、可用性与视觉系统

- 深色模式完整迁移：系统外观、状态栏、原生导航栏跟随系统。
- 共享的 AppSheet：手势弹层、键盘避让、弹簧回弹、Reduce Motion。
- 本地诊断：经脱敏后最多保存最近 10 条错误，可在账户页查看、分享、清除；只保存在本机 SQLite。
- 视觉与交互应继续使用 `ThemeProvider`、`useTheme()` 与语义 token，避免新加硬编码浅色。

## 6. Bangumi P1、Turnstile 与上游现实

- `/v0` 是公开 API；`/p1` 是 Bangumi 官方客户端使用的内部接口。Kaku 可以在用户 OAuth 授权后调用，但应 **经 Worker 转接**，并给公开读取保留 v0 兜底；页面不可直接依赖 P1。
- Bangumi PR #1765 已合并，将 `kaku://auth/turnstile` 加入白名单。
- 任何需要 Turnstile 的写操作（尤其发布动态/话题）会打开 `next.bgm.tv` 做 Cloudflare 验证。这是 Bangumi 的服务端强制校验，不能绕过或静默伪造；应优化回跳与失败体验，而不是尝试跳过验证。

## 7. 已知上游限制（不要误修成产品 bug）

1. **角色/人物取消收藏**：Bangumi P1 上游返回 500。入口已用开关隐藏，代码/页面/查询仍保留；待上游恢复后做 iOS 与 Android 真机验收再打开。
2. **删除自己的动态**：`DELETE /p1/timeline/{id}` 实测 5xx，官网与官方 iOS 也没有可用 UI；入口已移除。
3. **加入/退出小组**：P1 无公开写端点。不要猜端点，也不要抓官网表单冒充 API。
4. 私密/受限话题依赖登录态和上游权限，读取应通过携带 session 的 Worker 路径，失败必须明确告知。

## 8. 关键维护约定

### 主题与页面

- 页面样式用 `createStyles(colors)` + `useTheme()`。
- `app-error-boundary.tsx` 在 `ThemeProvider` 之外，是 class 组件；保留独立浅色错误兜底，不能为了主题一致性改坏兜底页。
- 新页面需同时考虑：加载、空态、失败、缓存可用、重试、深色模式、动态字体与 iOS/Android 排版。

### 弹层与动画

- 所有业务弹层优先用 `features/shared/app-sheet.tsx`。不要在内部再套 `KeyboardAvoidingView` 或 `flex: 1`，会导致弹层坍缩。
- Worklet 只能调用模块级 `'worklet'` 函数或内联逻辑；组件作用域函数在 React Compiler 下可能报：`Tried to synchronously call a Remote Function`。
- 可触摸动画优先 spring，必须尊重 Reduce Motion。不要为“有动效”增加没用的动效。

### 缓存、错误与隐私

- 不得用白屏隐藏失败；有旧数据时继续展示旧数据并告知是缓存。
- 本地诊断、日志、截图、分享内容必须脱敏：session/access/refresh token、client secret、OAuth code/state、用户目录等都不得泄露。
- 新增 Worker route 时要补 API 测试，并评估是否需要 D1 migration；无 schema 变更不要做无关 migration。

## 9. 发布与部署

### Android 日常 Preview

- 优先本地拆 ABI 构建，不消耗 EAS 月度免费额度：

```sh
bash scripts/build-split-apks.sh android-1.0.0-<n>
```

- 产出 4 个 debug 签名 APK（约 50–62MB），位于 `apps/mobile/dist-split/`，并自动发 GitHub Release。
- 因为 debug 签名与 EAS 签名不同，用户安装前必须卸载旧版。
- ABI 控制用 `-PreactNativeArchitectures`；Expo SDK 57 已移除旧的 `android.abiFilters` / `expo-build-properties` ABI 配置，**不要重新加回去**。

### Android 正式上架 Play

- 使用 EAS `production` profile，产物为 AAB，EAS 远端签名，带 Sentry source map 上传。
- GitHub Actions 的 `Release Android APK` 需要仓库 Secret `EXPO_TOKEN`。
- EAS 免费额度有限，耗尽时不要反复触发云构建；日常预览回退到本地拆分 APK。

### 网络与环境

- Git push / EAS 上传前，若 Clash 代理导致连接挂起，执行：

```sh
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY
```

- 本地 Android 构建需要 `ANDROID_HOME`、JDK 17；本地 crash reporting 需要 `apps/mobile/.env` 的 `EXPO_PUBLIC_SENTRY_DSN`，但不得提交该文件。

## 10. 验证基线

```sh
pnpm typecheck
pnpm test
pnpm --filter @kaku/mobile exec expo export --platform ios --output-dir /tmp/kaku-ios-check
pnpm --filter @kaku/mobile exec expo export --platform android --output-dir /tmp/kaku-android-check
git diff --check
```

- iOS 优先用模拟器做视觉验收；Android 以实机为主，不要求日常一直连 adb。
- 端到端冒烟：

```sh
MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true \
  "$HOME/.maestro/bin/maestro" test .maestro/public-browse-smoke.yaml
```

- 该 smoke test 曾发现一个真实问题：复用中的 `/explore` screen 不会因新的 `q` 参数重新初始化 `useState`，导致首页重复搜索进入综合页却没有带 query。修复原则是监听 `initialKeyword` 变化，同步 `draft` 与 `keyword`，但不要在 effect 里重复写搜索历史。

## 11. 后续优先级

1. 对所有登录写链路进行 iOS/Android 真机验收，尤其 Turnstile 回跳、回复编辑删除、好友/目录操作。
2. 建立 Sentry 项目、配置 DSN 与 source map 上传 token，做到线上崩溃可定位；敏感 token 仅放 EAS/GitHub secrets。
3. 补充 Maestro 测试：公开浏览、登录回跳、不会实际污染用户数据的只读路径；写操作保留人工真机验收。
4. EAS/商店发布：补 Apple App Store Connect 和 Google Play 凭据，正式生产包用 EAS production，不用本地 debug APK。
5. 等 Bangumi 上游恢复角色/人物取消收藏和动态删除等接口，再解除 `TODO.md` 中的隐藏功能。

## 12. 迁移检查清单

- [ ] 拷贝本文件、`AGENTS.md`、`RELEASE.md`、`TODO.md`、`OPNCODE_HANDOFF.md`。
- [ ] 迁移 `.env` / Cloudflare / EAS / GitHub Secrets 时只通过各平台 Secret 配置，不写进 Git。
- [ ] 核验新环境的 pnpm、Node、JDK 17、Android SDK、Xcode 与 Expo Dev Client。
- [ ] 登录 Wrangler 后验证 Worker、D1 bindings、Bangumi OAuth callback URL 与 `kaku://` deep link。
- [ ] 执行 typecheck、test、iOS/Android export 和 Maestro smoke。
- [ ] 先处理 `TODO.md` 的上游限制，不要把已知上游 5xx 改成客户端“伪成功”。
