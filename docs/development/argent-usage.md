# Argent 使用手册（Kaku 项目）

> 核对日期：2026-09-10
> 适用：已配置 argent MCP 的 agent 会话 + 本仓库的模拟器开发与测试
> 历史 Argent：0.24.0（当时由 pnpm 全局安装）；2026-10-02 本会话没有 Argent MCP / CLI。

历史环境的技能位于 `~/.agents/skills/argent-*`。使用前先确认当前会话实际提供了技能与 MCP；可用时先读对应技能，再调工具。
不要把某一台模拟器的 UDID 写死进流程：每次先 `list-devices`。

## 历史环境记录（会话开始时复核）

- 先前会话已挂载 argent MCP（`argent mcp`），2026-10-02 当前会话没有暴露 Argent / React profiler 工具，改用 Maestro 和 simctl；安装过不等于本会话可调用。
- iOS dev client 装在 iPhone 18 Pro（iOS 27.0）模拟器上，bundle id `com.shqingda.kaku.debug`
- iOS Maestro 全量入口 `.maestro/kaku-regression-ios.yaml` 已在 2026-09-04 实跑通过
- 视觉验收与性能基线见 `docs/test-records/2026-09-04-ios-ui-profiler.md`

## 标准开场（每次会话）

说一句「用 argent 连上 iOS 模拟器，调试一下 XX 页面」即可。agent 按
`argent-ios-simulator-setup` 走：`list-devices` → 没启动就 `boot-device` →
`open-url` 发 `exp+kaku://expo-development-client/?url=...` 加载 bundle。
Metro 仍由本机 `pnpm dev:mobile` 提供，不要另起一份。

Argent 的 `describe` / `gesture-tap` 走自己的无障碍服务，**不依赖 idb**。

## 三类任务，选对工具

| 任务 | 用什么 | 为什么 |
| --- | --- | --- |
| 探索页面、找元素、单步交互 | `describe` → `gesture-tap` | 读无障碍树拿 label 和归一化坐标（0–1），不要从截图像素猜 |
| 调 JS 问题（白屏、报错、状态不对） | `debugger-log-registry`、`debugger-component-tree`、`debugger-evaluate` | 走 Metro CDP |
| 可重复的回归验证 | `pnpm test:smoke` / `pnpm test:smoke:all` | Maestro 已覆盖关键路径；不必迁到 `.argent/flows/` |

发新页面的验收节奏：视觉截图目检 → Maestro 相关流程通过 → 需要人工手感或
OAuth 的场景再开 argent 会话，记录追加到 `docs/test-records/`。

## 包名

由 `apps/mobile/app.config.js` 的 `EAS_BUILD_PROFILE` 决定：

| 构建 | 包名 |
| --- | --- |
| 本地 / debug / 无 `EAS_BUILD_PROFILE`（含 iOS、Android dev client） | `com.shqingda.kaku.debug` |
| GitHub 日常 release APK、EAS `production` / `github` | `com.shqingda.kaku` |

`.maestro/kaku-*-ios.yaml` 用 debug 包名。`.maestro/kaku-*-android.yaml`
目前写的是 `com.shqingda.kaku`（release 包）；用 `expo run:android` 的
debug 包跑会找不到 App。Android 全量入口还没有实跑。

## 本机注意事项

1. **Android**：本机曾经删掉 AVD。需要 Android 时先 `list-devices`，有真机
   再用；不要默认再开一份模拟器。真机连 Metro：
   `adb reverse tcp:8081 tcp:8081`。
2. **Xcode 27 无独立 Simulator.app**（改为 DeviceHub）。任何工具的
   `openSimulator: true` 都会报「Unable to find application named 'Simulator'」，
   设备启动与操作本身不受影响。SDK 57 使用 `expo-build-properties` 的
   `ios.enableSceneSupport: true` 开启 iOS 27 要求的 UIScene 生命周期，
   prebuild 会生成官方场景入口。原生依赖更新后必须重建开发客户端。
3. **Maestro 选择器**（详见 `.maestro/kaku-smoke-steps.yaml` 注释）：
   RN 容器设了 `accessibilityLabel` 后 iOS 无障碍树只暴露容器；展开卡片的
   `text` 是 `'expanded'`；`assertVisible` 不支持 `timeout`，长等待用
   `extendedWaitUntil`；管道跑 Maestro 要 `set -o pipefail`。
   `changelog-checks.yaml` 钉死某一条更新日志文案，发新版后若那条被删才需要改。
4. **Argent 0.24 已知限制**（2026-09-04 实测）：部分页面 `describe` 仍可读树，
   但 `gesture-tap` / swipe 未送达 App。连续两次同一坐标失败就停，改用
   Maestro 或重新 `describe`，不要死戳。
5. 某工具报原生模块错误时：若 npm 跳过了 `node-pty` / `tree-sitter` 编译，
   按安装警告补 `allow-scripts` 后重装。
6. 升级：`npm update -g @swmansion/argent`（无 Homebrew formula）。
   历史记录使用 pnpm 全局的 0.24.0，实际版本用 `argent --version` 核对。
