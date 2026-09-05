# Android 发布验收基础设施

日期：2026-09-05。状态：设备验收阻塞，不能标为可发布。

- 本机有 SDK platform-tools、build-tools、Maestro 与本地 release APK。
- Argent list-devices 未发现 Android 设备，AVD 列表为空；SDK 下没有 emulator 或 system-images。
- 已检查验收入口无设备时失败并写出 blocker；这是失败路径检查，不是设备实跑。
- Android 共用流程原先无条件打开 dev client 链接，现已按平台区分。
- 未执行：最终 APK 冷启动、全量回归、已登录/未登录分支、键盘与返回、通知权限、OAuth、Sentry 后台验证、旧版升级。
- 本地历史 APK 无构建清单，不能将当前 HEAD 当作其来源；新构建才生成来源清单。

脚本验证：bash 语法检查、Node 语法检查、发布门禁测试（产物替换、源码变化、跳过、失败、缺少证据均拒绝）。
