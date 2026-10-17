# 动态发布应用内验证（2026-10-18）

## 自动化检查

- `pnpm test`：通过（移动端 390、API 380、shared 6 项）。
- `pnpm test:ui --runInBand`：63 组、361 项通过。
- `pnpm typecheck`：全 workspace 通过；最后一处 HTTP 错误处理修改后移动端复检通过。
- `pnpm --filter @kaku/mobile test:coverage`：94.82% 行覆盖，高于 92% 门禁。
- `pnpm install --frozen-lockfile --ignore-scripts`：通过。
- lockfile 包版本集合只增加 `react-native-webview@13.16.1`，其余变化为 peer 快照重算。
- `pnpm audit --json` 仍报告现有依赖告警（1 critical / 38 high / 20 moderate / 3 low）；
  报告未涉及本次新增的 WebView 或它的 `escape-string-regexp` / `invariant` 依赖。
  本轮不进行无关批量升级，不将审计表述为通过；发布前需单独处理已有告警。

## iOS 构建与环境

仅复用 iPhone 18 Pro / iOS 27.0：`498E27B7-5192-48CE-9B13-F4A27F10F806`。
先列出设备，通过 `pnpm dev:sim` 启动，重建并覆盖安装 `com.shqingda.kaku.debug`。
登录状态保留，未清除应用数据、钥匙串、历史或已有草稿。PosterBoard 核查为 disabled。
构建启动 DeviceHub 后输入被接管，重新运行 `pnpm dev:sim` 使用已授权的 repair-input 恢复。

第一次编译遇到 `ExpoModulesJSI.swiftinterface` 的 `cannot find type '__ObjC::expo'`。
构建日志证明该 framework 的缓存被直接复用；本机 Xcode 为 27.1（27A9275）。
仅移走当前 Pods 引用的 ExpoModulesJSI 模拟器 slice 的 `.build-hash`，触发当前 SDK
重建，随后构建成功（0 errors）。没有修改依赖源码或项目的预编译配置。
参考 [Expo 上游同类问题与恢复方法](https://github.com/expo/expo/issues/50365)。

## 实际界面验证

在 Codex 内置浏览器 `http://localhost:3200/` 实际点击「发布」进入动态编辑器，
确认新提示「安全验证将尽量自动完成」。原动态草稿为空，输入测试正文
`KAKU TEST2026-10-18`。键盘单键通道可用；浏览器批量 typeText / paste 未写入模拟器。

用户明确允许公开发布上述测试动态后，点击「发布」完成真实端到端验证：
Cloudflare 在应用内自动通过，没有跳转浏览器，也没有显示需要点击的验证区域；
成功后编辑器关闭。在「我的时光机」时间线中核对到完整正文
`KAKU TEST2026-10-18`，确认服务端已保存。本轮只发布一次。
需要人工交互的分支本次没有自然触发，已由组件测试验证显示、取消和超时行为。
Android 和真机未实测。评论、主题尚未迁移到此流程。

实现约束和上游契约见 [应用内验证说明](../development/timeline-verification.md)。
