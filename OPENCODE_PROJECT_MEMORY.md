# OPENCODE_PROJECT_MEMORY.md — Kaku

> 项目记忆 · 给新开的 opencode 会话 / codex 协作使用。**读完本文件应能独立上手，无需再翻代码。**
> 最后更新：2026-08-20。
> 相关：`AGENTS.md`（协作规范）、`RELEASE.md`（发版）、`TODO.md`（待办）、`OPNCODE_HANDOFF.md`（2026-08-13 旧交接，历史）。

---

## 0. 一句话

**Kaku 是 Bangumi（番组计划）的移动端第三方客户端**：登录、收藏、进度、评分、社区（评论/吐槽/讨论/动态/通知/小组/日志/目录）、搜索（条目/角色/人物）、浏览（排行/频道/每日放送/标签/维基）。用 Cloudflare Worker 做 OAuth 代理与会话，移动端直接调 Bangumi 公开 API + Kaku Worker，附带一个营销官网。

- 仓库：`https://github.com/shqingda/kaku`，分支 `main`，**commit + push 直推，无 PR 流程**
- 本地路径：`/Users/shqingda/Projects/kaku`（2026-08-20 从旧目录迁移至此；旧目录 `~/Documents/Codex/2026-07-15/https-bangumi-tv-codex-text-link` 已弃用）
- 线上：API `https://kaku-api.shqingda.workers.dev`，官网 `https://kaku-web.shqingda.workers.dev`
- 包名：正式 `com.shqingda.kaku`，开发 `.debug`、EAS dev `.dev`、preview `.preview`（`app.config.js` 按 `EAS_BUILD_PROFILE` 动态拼接）
- 里程碑：2026-08-13 交接建立 → 08-18 Sentry + 官网重设计 → 08-20 Release 自动化 + UX 打磨 + 迁移

---

## 1. Monorepo 布局（pnpm workspace）

```
apps/api/       Cloudflare Worker（Hono）+ D1。OAuth 代理、会话、公开数据代理
apps/mobile/    Expo SDK 57 / React Native / Expo Router。主产品
apps/web/       Vite + React 静态营销官网（zh/en 双语 + 三态主题 + 法律页）
scripts/        build-split-apks.sh（本地发版核心）
.github/workflows/  ci.yml（校验）、release-apk.yml（EAS 云端发版）
```

根 `package.json` scripts（代理有关）：`typecheck`、`test`、`build:web`、`dev:mobile` 等。

---

## 2. 后端 apps/api（Cloudflare Worker + D1）

### 架构

- **Hono** + Cloudflare Bindings（`Env = CloudflareBindings & SecretBindings`）
- `src/index.ts` → `createApp(dependencies)`（`src/app.ts`）→ 各域 `registerXxxRoutes(app, dependencies)`
- **依赖注入**：`dependencies = { now, fetcher, createStore, ... }` 便于测试（伪造时间/网络）
- **数据流**：客户端请求 Kaku Worker → Worker 用保存的 Bangumi token 代理请求 Bangumi → 返回。业务内容（评论/收藏/动态/通知）**不落库**，实时转发
- **边缘缓存**：`src/public-cache.ts` 用 Cloudflare Cache API 显式 `cache.put` 缓存公开 GET（条目/排行/榜单/每日放送等公开数据，不含个人信息）。响应头带 `X-Kaku-Cache: HIT|MISS`

### 目录 → 功能域

```
auth/           认证核心（见下）
db/schema.ts    D1 表（drizzle）
blogs/ browse/ channels/ collections/ discussions/ friends/ indexes/
notifications/ people-browser/ rankings/ reports/ tags/ timeline/ wiki/
   每个域：routes.ts（Hono 路由）+ bangumi-client.ts（调 Bangumi）+ schemas/types
```

### 认证与会话（最重要，别改坏）

完整流程：
1. 客户端打开 `GET /auth/bangumi/start` → 302 到 Bangumi OAuth（带 `state`，存 `oauth_transactions`）
2. Bangumi 回调 Worker → 换 token（`bangumi-token-service.ts`）→ **token 用 `TOKEN_ENCRYPTION_KEY`（AES-GCM）加密**存 `bangumi_credentials`
3. 生成**60 秒一次性 handoff code**（`auth_handoffs`，存哈希）→ 通过 deep link 回传给 App
4. 客户端拿 code → `POST /auth/session` 换 **Kaku session**（1h access + 90d refresh，refresh 每次轮换、DB 只存哈希）→ `POST /auth/session/refresh` 续期

**安全边界（不可违反）**：
- `BANGUMI_CLIENT_SECRET`、Bangumi access/refresh token 只在 Worker；**绝不在客户端/deep link 回传**
- 手机只保存 Kaku session token（`expo-secure-store`）
- 不改：token 加密、handoff 一次性、refresh 轮换 + 哈希

### D1 表（drizzle）

`users`（bangumi_user_id 主键）、`oauth_transactions`、`bangumi_credentials`（加密 token）、`auth_handoffs`、`sessions`（session_id）、`device_sessions`（多设备）。**业务内容不入库**。

### 部署

- `pnpm --filter @kaku/api deploy:worker`（wrangler）。**改 API 必须部署，不能只改本地**
- Wrangler OAuth 会过期：让用户自己跑 `pnpm --filter @kaku/api exec wrangler login`，**不要索要 API token**
- D1 migration：只在真正改 schema 时执行（`src/db`），多数接口是无状态代理无需迁移

### 环境变量（SecretBindings，值在 wrangler secret / 不提交）

`BANGUMI_CLIENT_ID`、`BANGUMI_CLIENT_SECRET`、`TOKEN_ENCRYPTION_KEY`。数据库 binding 名见 `worker-configuration.d.ts`。

---

## 3. 移动端 apps/mobile（主产品）

### 技术栈

Expo SDK 57 / Expo Router（文件路由）/ React Native / TypeScript / **@tanstack/react-query**（+ persist-client）/ **Reanimated**（AppSheet、图片查看器）/ expo-image / expo-symbols / expo-secure-store / expo-sqlite / expo-haptics / expo-network / Sentry。React Compiler 开启。

### 目录分层

```
src/app/            路由（expo-router 文件路由，见下）
src/features/       按领域组织组件 + hooks（auth, catalog, collections, discussions, timeline,
                    notifications, subject-detail, discover, community, home, users, people,
                    people-browser, indexes, reports, reviews, search, tags, wiki, blogs,
                    channels, browsing, staff, watching, theme, shared, history）
src/infrastructure/ API 客户端层
    bangumi/        Bangumi 官方 API 客户端（按领域分目录）+ transport/http-client.ts
                    （BangumiRequestError，带 status；12s 超时）
    kaku/           Kaku Worker 客户端（auth-client.ts 等，KakuApiError）
src/lib/           纯工具：query-keys, query-retry, query-persistence, query-persister,
                    user-error-message, auth-redirect, haptics, motion, sentry,
                    startup-timing, use-connectivity, use-reduce-motion, route-params,
                    bangumi-emoji, bangumi-content, format-activity-time, diagnostic-*
src/constants/      theme.ts（LIGHT/DARK 色板）、design.ts（SPACING/TYPE/触控尺寸）
src/types/         全局类型
```

### 路由表（src/app）

| 路由 | 职责 |
|---|---|
| `_layout.tsx` | 根：QueryClient + 持久化 + Theme/Auth/ErrorBoundary/OfflineBanner + 全局 header 按钮 |
| `index.tsx` | 首页：继续观看、好友动态预览、发布动态入口 |
| `explore.tsx` | 综合页：搜索 + 每日放送 + 排行 + 入口（频道/社区/日志/目录/人物/标签/维基）+ 回顶 |
| `browse.tsx` | 分类浏览（type/sort/year/tag 过滤，网格） |
| `rankings.tsx` | 排行（按类型） |
| `calendar.tsx` | 每日放送 |
| `subject/[id].tsx` | 条目详情（+ `/episode/[n]` 单集、`/topic/[id]` 讨论、`/review/[id]` 长评、`/staff`、`/characters`） |
| `character/[id]` `person/[id]` | 角色/人物详情 |
| `user/[username].tsx` `user/collections/[username]` `user/entities/[username]` | 用户主页/收藏/条目 |
| `timeline.tsx` | 好友动态全量页（底部居中「发布动态」胶囊） |
| `notifications.tsx` | 通知 |
| `community.tsx` `group/[name]` `group/topic/[id]` | 小组 |
| `blogs.tsx` `blog/[id]` | 日志 |
| `directories.tsx` `directory/[id]` | 目录 |
| `people.tsx` | 人物/角色浏览 |
| `tags.tsx` `wiki.tsx` | 标签、维基（从 explore 入口进） |
| `account.tsx` `auth/callback.tsx` `about.tsx` `privacy.tsx` `diagnostics.tsx` | 账户/登录回调/关于/隐私/诊断 |
| `+native-intent.ts` `+not-found.tsx` | 深链/404 |

### 数据获取约定（重要）

- 公开查询走 `useSessionAwareQuery`（无需登录，带重试 + 持久化）；私有查询需要 session
- **私有 GET 统一 `retry: shouldRetryBangumiQuery` + `retryDelay: bangumiRetryDelay`**（`lib/query-retry.ts`：2 次重试、跳过 4xx/408/429、600ms→3s 退避）；mutation 保持 `retry: false`
- `lib/query-keys.ts` 集中 query key；`lib/query-persistence.ts` 控制哪些公开查询写入 SQLite 持久化（离线可用）
- **失败不隐藏**：每个数据页 loading/error/empty 三态 + 重试按钮（`AppState` / `PagedListFooter` / `CachedDataNotice` / `DiscussionStatus`）；离线横幅（`OfflineBanner`）全局
- 错误文案一律走 `userErrorMessage(error, fallback)`（`lib/user-error-message.ts`）：映射 `KakuApiError.status` / `BangumiRequestError.status` / AbortError / 网络错误 → 中文友好文案，**不要直接把 `error.message` 抛给用户**

### 认证（客户端侧）

- `features/auth/auth-provider.tsx`：session 状态、signIn（开系统浏览器 OAuth）、completeSignIn（handoff code → session）、refresh、signOut、disconnect
- `lib/auth-redirect.ts`：`rememberReturnTo(pathname)` / `takeReturnTo()`——登录后 `router.dismissTo(来源)` 回原页，**不要 `replace('/')` 踢回首页**

### UI 约定

- Apple Design（`apple-design` skill 为准）：按压反馈（所有可点元素有 `pressed && styles.pressed`，opacity ~0.62）、触控目标 ≥44pt（小按钮加 `hitSlop`/`HIT_SLOP`）、spring 优先
- 主题：`ThemeProvider` + `useTheme()`；每个组件 `useMemo(() => createStyles(colors), [colors])`
- **Worklet 规则**：手势/动画回调在 UI runtime，只能调 module 级 `'worklet'` 函数或内联；**组件作用域函数不能从 worklet 调用**（React Compiler 下不可靠）
- 回到顶部：`features/shared/scroll-to-top-button.tsx` + `use-scroll-to-top-button.ts` hook（`scrollToOffset`/`scrollTo`，6 个长列表页已用）
- 图片：expo-image，`transition={120}` 统一淡入（大封面可用 180）

### 移动端环境变量

`EXPO_PUBLIC_SENTRY_DSN`（`.env`，gitignore，本地包内联）；EAS 云端另有 `SENTRY_AUTH_TOKEN`、`SENTRY_ORG`（`eas env:set` 管理）

---

## 4. 官网 apps/web（营销站）

- Vite + React 静态站，SPA（`wrangler` 部署 `kaku-web`，`not_found_handling: single-page-application`）
- 页面：首页（hero/feature/同步/FAQ/closing）、`/privacy` `/terms`（正式九节法律文本，双语）、404
- **i18n**：`src/i18n/translations.ts`（zh/en 全量字典）+ `I18nProvider`/`useI18n`；localStorage `kaku-lang`，默认跟随系统语言；切换按钮在 header
- **主题**：`useThemeMode` 循环 light/dark/system；`index.html` 内联脚本首屏同步避免闪白；颜色全走 CSS 变量 + `html[data-theme="dark"]`
- Header：品牌 + 右上角 GitHub / 语言 / 主题三按钮
- 部署：`cd apps/web && pnpm exec wrangler deploy`（wrangler 登录过期同上）

---

## 5. 发版（摘要；完整见 RELEASE.md）

- **日常迭代 preview（当前 EAS 额度受限，9/1 重置）**：
  `bash scripts/build-split-apks.sh android-1.0.0-<n>`
  → 4 个 per-ABI APK（arm64 60MB / armeabi 50MB / x86 62MB / x86_64 62MB），debug 签名（**需先卸载旧版**），本地约 10-15 分钟，**不耗 EAS 额度**
- **正式上架 Play**：EAS 云端 `production`（AAB、EAS 签名、Sentry source map），GitHub Actions `Release Android APK`（repo secret `EXPO_TOKEN`）
- **坑**：
  - `git push` / EAS 上传前 `unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY`（Clash 代理卡死）
  - ABI 用 RN `-PreactNativeArchitectures`；**Expo SDK 57 已移除 `android.abiFilters`/`expo-build-properties` ABI 支持，不要再加**
  - 本地构建禁用 Sentry source map 上传但内联 DSN（崩溃仍上报）；EAS 构建上传 source map
  - release notes 用英文
- 版本号 `1.0.0`（`app.config.js`），`production` profile 开 `autoIncrement`

---

## 6. 测试与校验

- `pnpm typecheck`（全 workspace）、`pnpm test`（API ~125 / mobile 136，全绿）
- `pnpm --filter @kaku/mobile test`（jest）
- CI `.github/workflows/ci.yml`：pnpm install → expo install --check → expo-doctor → typecheck → test → expo export (ios+android) → build web

---

## 7. 工具链

- **Maestro MCP** 已配置（`~/.config/opencode/opencode.jsonc`），可写/跑移动端 UI 测试（`.maestro/` 下有 flow）
- **vision agent**：模型本身不能读图，读截图用 `opencode-go/gpt-5.6-luna`（同配置文件）
- **Sentry**：项目 `kaku`，org `shqingda`；诊断页有「发送测试上报」按钮；告警已配置
- `adb`：`~/Library/Android/sdk/platform-tools`

---

## 8. 用户偏好 / 协作习惯

- 界面：iOS 优先、Android 真机兼容；Apple Design（留白、明确状态、可中断手势、呼吸感、现代化）
- "提交" = **commit + push**；改完跑 typecheck + test 再提交
- 会明确批评"太丑/太大/太简略"并期待高质量交付（中文排版字号收敛、APK 体积、文档详尽度都踩过）
- 一个需求一次小切片交付；重要设计先中文说明 + 给一个推荐
- 迁移后新目录 `/Users/shqingda/Projects/kaku`；`pnpm dev:mobile` + `pnpm open:android`（Android 真机）或 `expo run:ios`（iOS 模拟器装 dev client）

---

## 9. 待办 / 方向（详见 TODO.md）

- Play / App Store 上架（需付费账号：Play $25 / Apple $99）
- 商店素材（截图、文案——文案已在对话中草拟）
- 通知点击跳转补全（角色/人物/日志类通知）
- 列表性能（renderItem memo、onScroll 节流）
- 可选：设计 token 推广（已决定不做）、更多 Maestro E2E

---

## 10. 新 agent 上手清单（第一天）

1. 读 `AGENTS.md`、`RELEASE.md`、本文件、`TODO.md`
2. `cd /Users/shqingda/Projects/kaku && pnpm install`（已装好）
3. `pnpm typecheck` 确认基线
4. 起 Metro：`pnpm dev:mobile`；Android 真机 `pnpm open:android`，或 iOS 模拟器（需先 `expo run:ios` 装 dev client）
5. 改 API → 必须 `deploy:worker` 部署；push 前 unset 代理
