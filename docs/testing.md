# Kaku 测试指南

三层测试各管一层，互不重复：纯逻辑跑得最快，组件测试管渲染与交互，
Maestro 管真机/模拟器上的关键路径，argent 会话做人工级别的 UI 验收。

## 1. 纯逻辑单元测试（node:test）

- 位置：`apps/mobile/tests/*.test.mjs`（以及 `apps/api/tests/*.test.mjs`、
  `packages/shared/tests/`）。直接 import TS 源码，依赖 Node 26.5 的原生
  类型剥离，因此**被测模块的整条导入链不能引 react / react-native / expo**。
- 运行：`pnpm test`（全部 workspace）。
- 覆盖率门禁：`pnpm --filter @kaku/mobile test:coverage`（92% 行），
  `pnpm --filter @kaku/api test:coverage`（75% 行），CI 强制。

## 2. 组件 / Hook 测试（jest-expo + React Native Testing Library）

- 位置：`apps/mobile/tests/*.test.tsx`；全局 stub 见 `tests/ui/setup.ts`
  （偏好上下文与触觉）。RNTL v14 的 `render` 是 async，必须 `await`。
- 运行：`pnpm --filter @kaku/mobile test:ui`，CI 强制。
- 与 node:test 的分工：`.test.tsx` 归 jest，`.test.mjs` 归 node:test，
  两个 testMatch 互不重叠。

## 3. Maestro 冒烟测试（本地手动跑，不进 CI）

流程都在仓库根 `.maestro/`。iOS 开发构建的 bundle id 带 `.debug` 后缀，
入口流程是 `kaku-smoke-ios.yaml`（会先 openLink 重载 dev client 复位到首页）。
需要登录态的流程用 `runFlow.when` 门控，两种登录态都能跑通且不写远端。

| 流程 | 覆盖 |
| --- | --- |
| `kaku-smoke-ios.yaml` / `kaku-smoke-android.yaml` | 首页 → 账户 → 更新日志 → 网络诊断 |
| `public-browse-smoke.yaml` | 搜索 → 条目详情 → 返回 |
| `subject-comments.yaml` | 条目详情 → 吐槽箱 |
| `subject-sections.yaml` | 条目详情 → 角色与声优 → 返回 |
| `episode-signed-in.yaml` | 剧集行 → 剧集详情（含登录门控） |
| `search-clear.yaml` | 搜索 → 清空 → 回概览 |
| `rankings-smoke.yaml` | 排行榜入口 |
| `browse-smoke.yaml` | 频道 → 分类浏览 |
| `calendar-smoke.yaml` | 综合页 → 每日放送 |
| `directories-smoke.yaml` | 综合页 → 目录发现 |
| `settings-theme-toggle.yaml` | 外观切换（深色 ↔ 跟随系统，截图留证） |
| `timeline-smoke.yaml` | 好友动态（登录门控） |
| `collection-box-signin.yaml` | 收藏盒未登录门控 |

运行：

```bash
pnpm test:smoke          # iOS 模拟器（dev client 需已安装并启动 metro）
pnpm test:smoke:android  # Android 模拟器
maestro test .maestro/rankings-smoke.yaml   # 单条流程
```

## 4. UI 交互验收（argent 会话）

argent 是 agent 驱动的模拟器交互测试：起模拟器、装 debug 构建、
按真实用户路径走查（动效手感、骨架屏、离线文案、无障碍），结果按
`docs/test-records/` 的既有格式归档。OAuth 登录、真实写入等需要人工
参与的场景记录在该目录的验收报告中。
