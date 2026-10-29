# 在 Codex 中运行 iOS 模拟器

在项目根目录运行：

```sh
pnpm install
pnpm dev:sim
```

需要 macOS、Xcode，以及指定设备上已安装的 Kaku 开发客户端。
首次安装或原生依赖变化时，先按项目首页重建开发客户端；此命令不会自动构建或覆盖安装。
`serve-sim` 是固定版本的根目录开发依赖，不需要每次使用 `npx` / `pnpm dlx`，也不会打进 App。

启动后，在 Codex 内置浏览器打开 [Simulator Preview](http://localhost:3200/)。
脚本只输出地址，不会打开系统默认浏览器。以后直接对 Codex 说：

> 打开 Kaku 模拟器。

Codex 应运行 `pnpm dev:sim`，再用浏览器工具打开或复用上述预览页，并通过实际点击确认输入有效。
画面中的点击、拖动和键盘输入由 `serve-sim` 传回苹果模拟器；画面正常不代表输入正常。

## 命令做什么

1. 列出设备，只复用 iPhone 18 Pro / iOS 27.0，UDID `A395E274-D899-42DA-BE4C-416A9F89F671`。
   关机时启动；缺失或不可用时直接报错，不创建、克隆或抹掉设备。
2. 检查开发客户端，保持 PosterBoard 停用。保留登录、钥匙串、历史和草稿。
3. 复用当前仓库的 Metro，或在 8081 启动它。使用 `--host lan`，避免本机 `--localhost`
   只监听 IPv6、开发客户端访问 IPv4 而连接失败的问题。Metro 会监听网络接口；预览只绑定本机。
4. 检查 `com.apple.coredevice.dtuhidd.active`。只有值为 `1`，才运行
   `serve-sim repair-input`；这是用户授权的输入恢复例外，会重启模拟器的 backboardd / SpringBoard，
   短暂关闭运行中的 App。连续三次确认 SpringBoard 稳定运行后重启该设备的预览，再打开 Kaku。
5. 复用或在 3200 启动指定设备的预览。未知端口占用会报错，不终止未知进程。

Metro 和预览在后台运行，重复执行会复用，终端命令结束不会停止它们。
不要并发运行多份 `pnpm dev:sim`。失败时已启动的服务保留供排查，可修正后重新运行。
日志在系统临时目录的 `kaku-dev-sim/metro.log` 和 `preview.log`。

## 能看但不能点

再次执行 `pnpm dev:sim`，然后刷新预览页。DeviceHub 在重新连接设备后可能再次接管输入；
脚本会在检测到接管时恢复，不在每次启动时无条件重启 App。
若仍无反应，查看 `preview.log`，并先确认点击是否出现在：

```sh
pnpm exec serve-sim event-log -d A395E274-D899-42DA-BE4C-416A9F89F671
```

事件日志只证明操作到达服务，最终仍需检查 App 页面变化。
Xcode 27 的键盘桥接可能需要 macOS 辅助功能权限，脚本不会自动修改权限；
本机已实测旧输入通道恢复后，点击、拖动和英文键盘输入可用，中文输入法需另行验收。

停止预览可运行（只针对指定设备）：

```sh
pnpm exec serve-sim --kill A395E274-D899-42DA-BE4C-416A9F89F671
```

Metro 可通过本地进程管理工具单独停止；停止服务不需要清除应用数据。
壁纸服务的核查与恢复见 [Argent 使用手册](argent-usage.md)。

## 验证记录（2026-10-15）

- `pnpm test:tooling`：包含 8 项启动、恢复、端口归属和失败状态回归。
- `pnpm test`：全 workspace 单元测试通过。
- 本机实跑：停止已有 Metro / 预览后通过新命令启动，再次执行确认复用；
  Codex 内置浏览器点击头像成功展开菜单，登录与 PosterBoard 停用状态保留。
- 输入故障已在同日会话中手动恢复并验证点击、滑动和英文输入；封装后的恢复分支用模拟命令回归，
  本轮未人为重新制造输入故障。关机设备启动分支同样由模拟命令覆盖。
