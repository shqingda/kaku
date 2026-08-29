# Argent 使用手册（Kaku 项目）

> 日期：2026-08-29
> 适用：zcode 会话 + 本仓库的 iOS 模拟器开发与测试
> Argent 版本：0.22.1（npm 全局，`/opt/homebrew/bin/argent`）

## 已经就绪的部分（不用再做）

- `argent` MCP 已配置在 zcode（`command: argent, args: [mcp]`），重启会话后工具自动挂载
- `argent init` 装的技能（`~/.zcode/skills/argent-*`）已生效，agent 会自动按里面的工作流走
- iOS dev client 已装在 iPhone 17 Pro 模拟器；`.maestro/kaku-smoke-ios.yaml` 冒烟 flow 已两遍验证通过并入库

## 标准开场（每次会话）

说一句「用 argent 连上 iOS 模拟器，调试一下 XX 页面」即可。agent 会按
`argent-ios-simulator-setup` 技能执行：`list-devices` 找模拟器（iPhone 17 Pro
UDID `7A34107F-E5D7-4E31-8DC2-8155EEEB8288`）→ 没启动就 `boot-device` →
`open-url` 发 `exp+kaku://expo-development-client/?url=...` 加载 bundle。
metro 照旧由用户跑 `pnpm dev:mobile`。

注意：argent 的 `describe`/`gesture-tap` 走自己的 ax-service，**不依赖 idb**，
补上了本机「原生插件 UI 自动化不可用」的缺口。

## 三类任务，选对工具

| 任务 | 用什么 | 为什么 |
| --- | --- | --- |
| 探索页面、找元素、单步交互 | `describe` → `gesture-tap` | 直接读无障碍树拿精确 label 和归一化坐标（0–1），不用截图猜 |
| 调 JS 问题（白屏、报错、状态不对） | `debugger-log-registry`、`debugger-component-tree`、`debugger-evaluate` | 走 Metro CDP，maestro 没有的能力 |
| 可重复的回归验证 | `maestro test --device <udid> .maestro/kaku-smoke-ios.yaml` | 已写好、已两遍通过；不必迁去 argent 自己的 flow 格式（`.argent/flows/`） |

发新页面的验收节奏：视觉截图目检 → 冒烟 flow 连续两遍通过（argent-qa-flows
标准）→ 记录追加到 `docs/test-records/`。

## 本机注意事项

1. **不要启动 Android 模拟器**（AVD 已按要求删除）。实机连 adb 时：先
   `adb reverse tcp:8081 tcp:8081`；包名 `com.shqingda.kaku`（无 `.debug`
   后缀，与 iOS dev client 不同）。
2. **Xcode 27 无独立 Simulator.app**（改为 DeviceHub）。任何工具的
   `openSimulator: true` 都会报「Unable to find application named 'Simulator'」，
   设备启动与操作本身不受影响。
3. **maestro 选择器规则**（详见 `.maestro/kaku-smoke-steps.yaml` 注释）：
   RN 容器设了 `accessibilityLabel` 后 iOS 无障碍树只暴露容器、maestro 精确
   匹配；展开卡片的 `text` 属性是 `'expanded'`；`assertVisible` 不支持
   `timeout`，长等待用 `extendedWaitUntil`；管道跑 maestro 要
   `set -o pipefail`。
4. argent 某工具报原生模块错误时：npm 默认跳过了 `node-pty`/`tree-sitter`
   编译脚本，按安装警告执行 `npm config set allow-scripts=... --location=user`
   后重装。
5. 升级：`npm update -g @swmansion/argent`（无 Homebrew formula，npm 是唯一
   官方渠道）。
