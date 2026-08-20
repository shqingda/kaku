# OPENCODE_PROJECT_MEMORY.md — Kaku

> 项目记忆 / AI agent 长期上下文。最后更新：2026-08-20。
> 发版细节见 `RELEASE.md`，协作规范见 `AGENTS.md`，历史待办见 `TODO.md`。

## 这是什么

**Kaku**：为移动端重新设计的 Bangumi（番组计划）第三方客户端。pnpm monorepo，iOS + Android + 营销官网。

- 仓库：`https://github.com/shqingda/kaku`（分支 `main`，commit + push 直推，不做 PR）
- 本地路径：`/Users/shqingda/Projects/kaku`（2026-08-20 从旧目录迁移至此）
- 线上：API `https://kaku-api.shqingda.workers.dev`，官网 `https://kaku-web.shqingda.workers.dev`
- 产品中立：Bangumi 是适配器/数据源，不是领域模型

## 技术栈

| 包 | 技术 |
|---|---|
| `apps/api` | Cloudflare Worker + D1，Bangumi OAuth 代理 + Kaku session |
| `apps/mobile` | Expo SDK 57 / Expo Router / React Native / TypeScript / React Query / Reanimated |
| `apps/web` | Vite + React，静态营销站（zh/en 双语 + 日/夜/系统主题 + 正式法律页） |

## 关键架构决策（不要轻易推翻）

- **失败绝不隐藏**：每个数据页有 loading/error/empty 三态 + 重试，无空白加载态；离线横幅明确提示
- **provider-neutral**：Bangumi 只是适配器；错误文案中文化（`lib/user-error-message.ts` 映射 `KakuApiError`/`BangumiRequestError`/超时/网络错误）
- **Apple Design**：按压反馈（pressed 态）、触控目标 ≥44pt、spring 优先、截图级视觉一致性（`apple-design` skill 为准）
- **隐私**：Bangumi token 只在 Worker（AES-GCM），手机只拿 60s handoff code；业务内容不落库（实时转发）；诊断记录只在设备本地
- 私有 GET 查询统一接入 `shouldRetryBangumiQuery + bangumiRetryDelay`（`lib/query-retry.ts`）

## 登录与安全边界（必须遵守）

- `client_secret`、Bangumi token 只在 Worker；绝不在 deep link / 客户端回传
- Kaku session：1h access + 90d refresh，refresh 每次轮换、只存哈希
- 不记录/打印/提交任何 token、secret
- 手机只保存 Kaku session（`expo-secure-store`）

## 发版（详见 RELEASE.md，agent 部署前必读）

- **日常迭代 preview（当前 EAS 额度受限期间，9/1 重置）**：本地脚本
  `bash scripts/build-split-apks.sh android-1.0.0-<n>`
  → 4 个 per-ABI APK（50-62MB，debug 签名，需先卸载旧版），不耗 EAS 额度，本地约 10-15 分钟
- **正式上架 Play**：EAS 云端 `production`（AAB + EAS 签名 + Sentry source map），GitHub Actions workflow `Release Android APK`（需 repo secret `EXPO_TOKEN`）
- **坑**：
  - `git push` / EAS 上传前必须 `unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY`（Clash 代理会卡死）
  - ABI 用 RN `-PreactNativeArchitectures`；**Expo SDK 57 已移除 `android.abiFilters` / `expo-build-properties` ABI 支持，不要再加**
  - 本地构建禁用 Sentry source map 上传但内联 DSN（崩溃仍上报）；EAS 构建上传 source map
  - release notes 用英文
- 版本号 `1.0.0`，tag 建议 `android-1.0.0-<n>`

## 部署与登录（易过期）

- 改 API 必须 `pnpm --filter @kaku/api deploy:worker` 部署，不能只改本地
- Wrangler OAuth 会过期：让用户自己 `pnpm --filter @kaku/api exec wrangler login`（或 web 目录），不要索要 API token
- EAS CLI 新语法：`eas env:set --name X --value Y --environment development --environment preview --environment production --visibility plaintext|sensitive`

## 已实现功能

- 登录/会话管理（OAuth、设备会话、断开连接）、收藏盒（状态/进度/评分/标签/吐槽）、评论/回复/动态/话题/举报/目录的 CRUD、好友、人物/角色浏览与搜索、时间线、通知、搜索（条目/角色/人物）、排行、频道、目录、小组、日志、每日放送、标签页、维基动态、离线缓存与横幅、图片查看器、主题（日/夜/系统）、双语（官网）、Sentry 崩溃监控、首屏指标、路由参数同步、`/tags` `/wiki` 入口、条目标签可点、时间线发布按钮（底部居中胶囊）、回到顶部按钮（6 个长列表页）
- 官网：双语切换、主题切换、正式隐私政策/服务条款、GitHub 链接

## 测试与校验

- `pnpm typecheck`（全 workspace）、`pnpm test`（API 125 / mobile 136，全绿）
- 移动端 jest 测试：`pnpm --filter @kaku/mobile test`
- CI：`.github/workflows/ci.yml`（typecheck + test + expo export + web build）

## 用户偏好 / 工作习惯

- 界面：iOS 优先、Android 真机兼容；Apple Design（留白、明确状态、可中断手势）
- "提交" 通常指 **commit + push**；不喜欢被追问无关细节
- 会明确指出"打磨不够/太丑/太大"并期待高质量整改（字号、呼吸感、现代化、体积）
- 模型本身不能读图——读截图用 vision agent（`opencode-go/gpt-5.6-luna`，配在 `~/.config/opencode/opencode.jsonc`）
- Maestro MCP 已配置，移动端 UI 验证可用

## 里程碑

- 2026-08-13：交接文档（OPNCODE_HANDOFF.md）建立
- 2026-08-18：Sentry 接入 + 官网重设计（双语/主题/法律页）
- 2026-08-20：Release 自动化（4 架构拆分脚本）、一批 UX 打磨（按压反馈/登录回来源/错误中文化/私有重试/收藏盒草稿确认）、迁移到 `/Users/shqingda/Projects/kaku`
- 待办：Play/App Store 上架（需花钱）、商店素材、通知点击跳转补全、列表性能优化（renderItem memo）
