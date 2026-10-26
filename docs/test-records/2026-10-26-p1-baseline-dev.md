# P1 性能基线：开发模式（2026-10-26）

**这是开发模式基线**：开发客户端 `com.shqingda.kaku.debug`，JS 由本机 Metro 提供（`__DEV__`），
数值偏慢，只用于同条件前后对比；不代表正式包启动速度或内存，也不能与 Release / 旧设备数据比较。

## 条件

| 项 | 值 |
| --- | --- |
| 设备 | iPhone 18 Pro / iOS 27.0 模拟器，UDID `498E27B7-5192-48CE-9B13-F4A27F10F806`（先列设备后复用） |
| 构建 | 现有开发客户端，未重装；`pnpm dev:sim` 启动 Metro（8081）与预览 |
| 数据 | 保留现有登录与本机数据，未清缓存、未退出；不是首次安装 |
| 代码 | 提交 `2c3356e` |
| 预热 | Metro 首次打包 14.2 s 后先跑一轮预热（第 0 轮），不计入 |
| 路径 | 终止 App → 用开发客户端 URL 重新打开 → 等待 25 s 停在首页 → `footprint -p <PID>` → 深链 `kaku://diagnostics` → 截图读取计时 |

每轮命令（宿主机）：

```sh
xcrun simctl terminate <UDID> com.shqingda.kaku.debug
xcrun simctl openurl <UDID> 'exp+kaku://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081'
# 等 25 s
footprint -p "$(xcrun simctl spawn <UDID> launchctl list | awk '/com.shqingda.kaku.debug/{print $1}')"
xcrun simctl openurl <UDID> 'kaku://diagnostics'
xcrun simctl io <UDID> screenshot round.png
```

计时来自 `startupTiming`（JS 模块求值起点，不含原生进程启动）；内存是 macOS `footprint`
对模拟器进程的读数，读取时停在首页、尚未进入诊断页。

## 结果

| 轮次 | JS 首布局 | 缓存恢复结束 | 首页可用 | 首页状态 | Footprint | Malloc Small（dirty） |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 555 ms | 617 ms | 678 ms | 空态 | 392 MB | 305 MB |
| 2 | 554 ms | 614 ms | 675 ms | 空态 | 388 MB | 301 MB |
| 3 | 537 ms | 591 ms | 639 ms | 空态 | 388 MB | 300 MB |
| **中位数** | **554 ms** | **614 ms** | **675 ms** | | **388 MB** | **301 MB** |

预热轮（不计）：606 / 676 / 744 ms，385 MB。

三轮之间首页可用时间相差 39 ms（约 6%），内存相差 4 MB（约 1%）。后续实验的收益必须
超过这一波动才算有效。其他稳定分项：Untagged 32 MB、Malloc Large 29 MB、mapped file
22–23 MB（clean）、CoreAnimation 2.2–2.5 MB。

## 边界

- 首页状态三轮都是“空态”，即首个收藏区为空或没有可显示内容；没有覆盖“有内容”状态的首页。
- 未测原生进程启动、帧率、JS heap 或图片内存拆分；`argent` 与 Activity Monitor 仍不可用，
  React Native 调试连接仍需认证，未绕过。
- 开发模式 Malloc 大头含 Metro 打包产物与开发工具，Release 下的比例会不同。
- 三条固定交互路径（长章节、多图缩放、长列表、中文长文）未在本轮采样，P2/P3 实验应各自在
  对应路径上按同样条件补采前后数据。
