# Kaku OpenCode 交接（2026-08-13）

## 当前状态

- 仓库：`main`，当前提交 `f2a9834`，已推送到 `origin/main`。
- 技术栈：pnpm workspace；Expo Router / React Native / TypeScript；Cloudflare Worker + D1；Bangumi OAuth。
- 用户偏好：iOS 优先、Android 真机兼容；界面遵循 Apple Design（留白、明确状态、可中断手势）；用户说“提交 git”通常指 **commit + push**。
- App 正在开发测试，Android 日常不接 adb，默认以 iOS 模拟器验收；任何 Worker API 改动都必须部署，不能只改本地代码。

## 必须保留的安全边界

- Bangumi `client_secret`、Bangumi access/refresh token 只在 Worker；token 以 AES-GCM 保存。
- 手机只拿 60 秒一次性的 handoff code，绝不能通过 deep link 回传 Bangumi token。
- Kaku session 为 1 小时 access + 90 天 refresh，refresh token 每次使用必须轮换，只保存哈希。
- 不要记录、打印、提交 access token、session token、client secret、Wrangler API token。

## Worker 与部署

- 线上 App 使用：`https://kaku-api.shqingda.workers.dev`。
- 改 API 后执行：`pnpm --filter @kaku/api deploy:worker`。
- Wrangler 已以用户账号登录过，但认证会过期；失效时让用户自己完成 `pnpm --filter @kaku/api exec wrangler login`，不要索要 API token。
- 本地/远端数据库迁移只在真正变更 D1 schema 时执行；本轮新增接口均为无状态代理，不需要迁移。

## 已完成的主要能力

### 登录与个人数据

- OAuth 登录、Kaku session 刷新、当前设备退出、其他设备撤销、断开 Bangumi 连接。
- 收藏状态、评分、动画/三次元进度已通过真实登录接口同步。
- 收藏盒、人物/角色、好友主页、公开主页、好友动态、搜索、排行、频道、综合、目录、小组、日志、人物浏览等公开阅读主路径都已做。

### 社区写操作

- 新建条目/小组话题；回复条目话题、小组话题、单集吐槽、长评；回复支持新增、引用、编辑、删除。
- 添加/删除好友、屏蔽/取消屏蔽、举报用户/话题/回复。
- 目录新建、编辑、删除、收藏。
- 动态发布已接 Turnstile。Bangumi 已合并白名单 PR #1765：`kaku://auth/turnstile`；写操作仍会打开 `next.bgm.tv` 做 Cloudflare 验证，这是 Bangumi 的强制要求，不能静默绕过。

### 稳定性与发布工程

- 全站深色模式已经完整迁移；`app.json` 已启用系统自动外观。
- TanStack Query 公开浏览缓存已持久化，弱网/请求失败时保留旧数据，并明确展示“缓存数据”提示。
- 讨论、条目详情、追踪卡、公开用户页等均已处理缓存降级。
- `f2a9834` 新增本地诊断：错误边界会记录经脱敏后的最近 10 条错误；账户页可查看、分享和清除。数据只在本机 SQLite，不上传服务器。
- 已添加 EAS 的 development / preview / production 构建配置；尚未绑定 EAS 账号与商店凭据。

## 重要架构约定

### 主题

- `apps/mobile/src/constants/theme.ts` 是语义颜色 token 的唯一来源。
- 页面样式应使用 `createStyles(colors)` + `useTheme()`；避免继续散落 `#F7F6F2` 等硬编码色。
- `app-error-boundary.tsx` 是 ThemeProvider 之外的 class 组件，刻意保留静态浅色兜底，别为了统一而改坏错误页。

### 弹层、动画与 Worklet

- 所有业务弹层优先用 `apps/mobile/src/features/shared/app-sheet.tsx`。它自带 KeyboardAvoidingView 与手势；内部不要再嵌套 KAV 或 `flex: 1`，否则会坍缩。
- Reanimated UI runtime 只能调用模块级带 `'worklet'` 的函数或内联逻辑。不要在 worklet 中调用组件作用域 helper；React Compiler 下会报 `Tried to synchronously call a Remote Function`。
- 新交互遵循 Apple Design：轻触有即时反馈；可触摸动画优先 spring；尊重 Reduce Motion；错误、离线和空态必须显式。

### 数据边界

- 业务代码保持 provider-neutral；Bangumi 只在 `infrastructure/bangumi` 的 client/schema/adapter/provider 层。
- P1 是 Bangumi 内部客户端接口，需经 Worker 代理；公开 v0 可作为兜底。不要让页面直接绑定 Bangumi 返回结构。

## 上游限制 / TODO

- **角色/人物取消收藏**：Bangumi 上游实际返回 500，入口目前隐藏但代码保留。不要删除；恢复条件是 P1 上游正常后完成 iOS/Android 真机验证。见 `TODO.md`。
- **删除自己的动态**：`DELETE /p1/timeline/{id}` 实测 5xx，官网和官方 iOS 也没有可用 UI；入口已隐藏。
- **加入/退出小组**：P1 没有公开写端点，暂不臆测或抓网页表单。
- 仍缺：Sentry（需用户创建项目并提供 DSN/构建 token）、完整 EAS 初始化和商店凭据、真机逐条写操作验收、深色模式多尺寸验收。

## 最新发现：真实 E2E 冒烟测试暴露的搜索 bug（优先修）

已通过官方 Maestro CLI 在 iOS 模拟器运行：

```sh
MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true \
  "$HOME/.maestro/bin/maestro" test .maestro/public-browse-smoke.yaml
```

测试在“首页点搜索、输入《葬送的芙莉莲》、回车后应出现搜索结果”失败：页面被路由到 `/explore`，但仍显示综合页与空搜索框。

原因：`apps/mobile/src/app/explore.tsx` 将 `useLocalSearchParams().q` 只用作 `useState(initialKeyword)` 的初始值。Expo Router 在已有 Explore screen 时会复用该 screen；后续首页 `router.push({ pathname: '/explore', params: { q } })` 更新 query 参数，却不会重新执行 `useState`。于是 UI 的旧 state 覆盖了新 q。

低风险修复：在 `ExploreScreen` 中为 `initialKeyword` 增加同步 effect：

```ts
useEffect(() => {
  setDraft(initialKeyword);
  setKeyword(initialKeyword);
}, [initialKeyword]);
```

不要在 effect 内重复写搜索历史；首页提交搜索时已经写过。修完后重新跑上述 Maestro flow，它正好验证这个真实用户路径。

## 验证命令

```sh
pnpm typecheck
pnpm test
pnpm --filter @kaku/mobile exec expo export --platform ios --output-dir /tmp/kaku-ios-check
pnpm --filter @kaku/mobile exec expo export --platform android --output-dir /tmp/kaku-android-check
git diff --check
```

当前测试基线为 mobile 89 条、API 107 条（以实际输出为准）。

## 提交要求

- 每个小垂直切片：检查完整 diff、跑相关检查、排除生成物/秘密，再 commit 并 `git push origin main`。
- 不要创建 PR；用户明确要求直接推送自己的 `main`。
- 任何视觉改动都至少用 iOS 模拟器查看一次；若有 Android 影响，避免依赖用户一直连 adb。
