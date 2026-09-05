# Kaku 测试指南

三层测试各管一层，互不重复：纯逻辑跑得最快，组件测试管渲染与交互，
Maestro 管模拟器上的关键路径，argent 会话做人工级别的 UI 验收。

CI（`.github/workflows/ci.yml`）在 `main` 和 PR 上跑：Expo 依赖检查、
expo-doctor、全 workspace 类型检查、`pnpm test`、API 75% / 移动端 92%
行覆盖、jest 组件测试、iOS/Android JS bundle、官网构建。另有独立 job
跑 HTML 解析回归（`pnpm --filter @kaku/api test:html-parsers`）。
Maestro 和 argent **不进 CI**。

## 1. 纯逻辑单元测试（node:test）

- 位置：`apps/mobile/tests/*.test.mjs`（以及 `apps/api/tests/*.test.mjs`、
  `packages/shared/tests/`）。直接 import TS 源码，依赖 Node 26.5 的原生
  类型剥离，因此**被测模块的整条导入链不能引 react / react-native / expo**。
- 运行：`pnpm test`（全部 workspace）。
- 覆盖率门禁：`pnpm --filter @kaku/mobile test:coverage`（92% 行），
  `pnpm --filter @kaku/api test:coverage`（75% 行），CI 强制。

## 2. 组件 / Hook 测试（jest-expo + React Native Testing Library）

- 位置：`apps/mobile/tests/*.test.tsx`；全局 stub 见
  `apps/mobile/tests/ui/setup.ts`（偏好上下文与触觉）。
  RNTL v14 的 `render` 是 async，必须 `await`。
- 运行：`pnpm --filter @kaku/mobile test:ui`（根目录也有 `pnpm test:ui`），
  CI 强制。
- 与 node:test 的分工：`.test.tsx` 归 jest，`.test.mjs` 归 node:test，
  两个 testMatch 互不重叠。

## 3. Maestro（本地手动跑，不进 CI）

流程都在仓库根 `.maestro/`。平台入口持有真实包名，子流程用占位
`appId`，避免 Maestro 嵌套 `openLink` 丢 `${APP_ID}`。

iOS 全量入口 2026-09-04 已实跑通过。Android 入口文件在，**还没有实跑**
（见 `TODO.md`）。同一台设备必须串行，不要并发跑两条 flow。

### 入口

| 命令 | 文件 | 包名 |
| --- | --- | --- |
| `pnpm test:smoke` | `kaku-smoke-ios.yaml` | `com.shqingda.kaku.debug` |
| `pnpm test:smoke:all` | `kaku-regression-ios.yaml` | 同上 |
| `pnpm test:smoke:android` | `kaku-smoke-android.yaml` | `com.shqingda.kaku`（release 包） |
| `pnpm test:smoke:android:all` | `kaku-regression-android.yaml` | 同上 |

iOS 入口会先 `openLink` 重载 dev client，再跑共用步骤。全量入口把冒烟步骤
和下面各业务 flow 串起来；每条业务 flow 开头用 `reset-home.yaml` 回首页，
避免路由状态串台。需要登录态的 flow 用 `runFlow.when` 门控，两种登录态
都能跑通且不写远端。

Android yaml 写的是 **release 包名**，通过 `kaku://` 复位，不依赖 Metro。本地 `expo run:android` 打出来的是
`com.shqingda.kaku.debug`，对不上。要用 Android Maestro，先确认设备上装的
是哪一种包，必要时改 yaml 或装 release APK。

前置：对应平台的 App 已安装；iOS 还要 Metro 在 8081。

### 覆盖范围（16 项，对应全量入口）

冒烟步骤 `kaku-smoke-steps.yaml` 一次走完前 4 项（首页、账户、更新日志、
网络诊断）。其余每项一个 yaml。`changelog-checks.yaml` 只被冒烟步骤嵌套，
钉死一条仍存在的更新日志文案（现在是 1.1.1）；删掉那条 changelog 之后才
需要改选择器。

| 流程 | 覆盖 |
| --- | --- |
| `kaku-smoke-steps.yaml` | 首页 → 账户 → 更新日志 → 网络诊断 |
| `public-browse-smoke.yaml` | 搜索 → 条目详情 → 返回 |
| `subject-comments.yaml` | 条目详情 → 吐槽箱 |
| `subject-sections.yaml` | 条目详情 → 角色与声优 → 打开角色 → 返回 |
| `episode-signed-in.yaml` | 剧集行 → 剧集详情（含登录门控） |
| `search-clear.yaml` | 搜索 → 清空 → 回概览 |
| `rankings-smoke.yaml` | 排行榜入口 |
| `browse-smoke.yaml` | 频道 → 分类浏览 |
| `calendar-smoke.yaml` | 综合页 → 每日放送 |
| `directories-smoke.yaml` | 综合页 → 目录发现 |
| `settings-theme-toggle.yaml` | 外观切换（深色 ↔ 跟随系统，截图留证） |
| `timeline-smoke.yaml` | 好友动态（登录门控） |
| `collection-box-signin.yaml` | 收藏盒未登录门控 |

选择器规则写在 `kaku-smoke-steps.yaml` 顶部注释里。

### 性能复测

先 `maestro test .maestro/kaku-reset-ios.yaml`，profiler 连上之后再
`maestro test .maestro/kaku-profile-ios.yaml`。两段刻意分开，因为
dev client 重载会断开 React profiler。基线数字见
`docs/test-records/2026-09-04-ios-ui-profiler.md`。

## 4. UI 交互验收（argent 会话）

argent 是 agent 驱动的模拟器交互：起模拟器、装 debug 构建、按真实用户
路径走查（动效手感、骨架屏、离线文案、无障碍）。操作手册见
`docs/argent-usage.md`。结果按 `docs/test-records/` 的既有格式归档。
OAuth 登录、真实写入等需要人工参与的场景也记在那里。

Argent 0.24 在部分页面会出现「树读得到、手势送不进去」。这时改用 Maestro
或重新 `describe`，不要对着同一坐标连点。
