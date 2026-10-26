# P1 性能基线：Release 构建与交互路径（2026-10-26）

**结论**：Release 下启动和首页内存都很低，暂时没有需要优化的瓶颈。采样中发现并修复了一个真实问题：
角色/人物详情页把相关条目封面和头像都按原图加载，进入页面后进程从约 80 MB 涨到 400–495 MB。
修复后同类页面约 110 MB。P2 资料/章节分离实验没有立项依据，维持「明确不做」。

## 条件

| 项 | 值 |
| --- | --- |
| 设备 | iPhone 18 Pro / iOS 27.0 模拟器，UDID `498E27B7-5192-48CE-9B13-F4A27F10F806`（先列设备后复用） |
| 构建 | `xcodebuild -configuration Release -sdk iphonesimulator ARCHS=arm64`，内嵌 Hermes bundle（8.3 MB），`.app` 63 MB；包名沿用 `com.shqingda.kaku.debug` 覆盖安装 |
| 数据 | 覆盖安装保留登录和本机数据，未清缓存、未退出；不是首次安装 |
| 代码 | 启动基线：提交 `aa39159`；角色页修复前后对比见下文 |
| 恢复 | 采样前用 `ditto` 备份已安装的开发客户端 `.app`（1.1.21），结束后原样装回，确认不含内嵌 bundle |

构建前的本机环境修正（均不进入仓库）：`ios/.xcode.env.local` 的 Node 路径因 Homebrew 升级失效，改为
`/opt/homebrew/bin/node`；`ios/build/generated` 下 codegen 产物缺失，用 `LANG=en_US.UTF-8 pod install` 重新生成；
构建时显式设置 `EXPO_PUBLIC_KAKU_API_URL=https://kaku-api.shqingda.workers.dev`。

采样中途模拟器被外部关机一次（非本次操作），用 `simctl boot` 启动同一设备后继续，PosterBoard 保持停用。

## 启动与首页内存

方法同 [开发模式基线](2026-10-26-p1-baseline-dev.md)：终止 → `simctl launch` → 等 25 s 停在首页 →
`footprint -p <PID>` → 深链 `kaku://diagnostics` 截图读取计时。先跑一轮预热不计入。

| 轮次 | JS 首布局 | 缓存恢复结束 | 首页可用 | 首页状态 | Footprint |
| --- | --- | --- | --- | --- | --- |
| 1 | 76 ms | 88 ms | 154 ms | 空态 | 69 MB |
| 2 | 79 ms | 93 ms | 127 ms | 空态 | 61 MB |
| 3 | 94 ms | 107 ms | 121 ms | 空态 | 59 MB |
| **中位数** | **79 ms** | **93 ms** | **127 ms** | | **61 MB** |

预热轮（不计）：150 / 158 / 247 ms。首页可用三轮相差 33 ms，footprint 相差 10 MB；
后续实验的收益必须超过这一波动。第 2 轮分项：Malloc Small 21 MB、Untagged 18 MB、`__DATA` 12 MB、
CoreAnimation 2 MB、CG Image 0.2 MB，mapped file 25 MB（clean）。

与开发模式（554 / 614 / 675 ms，388 MB）相比，Release 的 JS 阶段约快 5 倍，内存少约 84%，
开发模式的数值不能代表正式包。

## 交互路径

每条路径从冷启动开始，深链进入，停留 10–15 s 后读 footprint。

| 路径 | 结果 |
| --- | --- |
| 长章节：条目 975（1191 集，12 页，并发 3） | 三轮 84 / 83 / 85 MB，内容完整 |
| 角色页（路飞 2358，45 个相关条目），修复前 | 三轮 495 / 491 / 473 MB，**异常** |
| 多图长帖：日志 382249（14 张图，查看器关闭态） | 三轮 73 / 75 / 74 MB |
| 长列表：动画排行榜滑动约 45 行 → 进入条目 → 返回 | 108 → 158 → 176 MB（单轮）；返回后停在原位置（第 42–49 名） |
| 中文长文本输入 | **未测**：需要在回复框输入，会在账号下生成持久草稿，按设备规则不为测试清理草稿 |

多图缩放/关闭手势、首页「有内容」状态（当前账号首个收藏区为空）、JS heap 和 Query 数没有采到；
footprint 只能看进程总量和分项。

## 角色页内存问题与修复

修复前分项：CG Image 248 MB、CoreAnimation 130 MB。原因：

- 相关条目列表用了 `/v0/characters/{id}/subjects` 的 `image` 字段，它只返回原图。路飞的 45 张封面里最大的
  是 4096 px，按 RGBA 解码合计约 216 MB；列表里封面高 68 pt。
- 头部头像（约 130 pt）用了 `images.large`（这张为 2346×3484，解码约 33 MB）。
- 两项相加约 249 MB，与 CG Image 一致。

修复（Bangumi 适配器内，领域模型保持中立）：

- 相关条目封面改写为 Bangumi 缩放地址 `https://lain.bgm.tv/r/200/pic/...`；非 Bangumi 地址原样保留。
- `PublicEntityDetail` 新增 `thumbnailUrl`（`medium`），头像使用它；全屏查看器仍用 `imageUrl`（原图）。
- 新增 2 项适配器测试；单元测试 408 项、相关 UI 测试 7 项、类型检查通过。

对比（Release，同条件，均为首次打开的角色，避免持久化缓存影响）：

| 组 | 角色 | 相关条目 | 第 1–3 轮 | 中位数 | CG Image |
| --- | --- | --- | --- | --- | --- |
| 修复前 | 娜美 2360 | 38 | 402 / 402 / 401 MB | 402 MB | 216 MB |
| 修复后 | 索隆 2359 | 42 | 108 / 110 / 110 MB | 110 MB | 未进前列（CoreAnimation 14 MB） |

角色不同但条目数量相近，降幅约 73%，远超波动。已经打开过的角色页，旧的原图地址存在 24 小时持久化缓存里，
重新打开仍会按原图加载，缓存过期后恢复正常；本次没有为此清缓存，也没有改缓存版本。

## 边界

- 模拟器数据，不代表真机；Release 包使用开发包名和 sandbox 推送配置，不是正式签名包。
- 条目详情页的大封面仍用 `images.large`（单张，条目页实测 85 MB），本次未改。
- 长列表路径只采了一轮。
