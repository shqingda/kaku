# 冗余清理、结构拆分与守护（2026-10-26）

按 [计划](../plans/2026-10-25-reliability-slimming-performance.md) 之后的下一轮整理执行：先清理冗余，再拆分结构，最后补守护。
修复和纯重构分开提交，没有推送。

## 结论

只读扫描显示**几乎没有死代码**：1093 个导出里只有 5 个完全没人用，其中 3 个必须保留
（`+native-intent.ts` 的 `redirectSystemPath` 是 expo-router 约定，`db/schema.ts` 的两张写锁表是迁移依赖）。
没有从未被引用的源文件，只有 2 个模板遗留文件；依赖也没有可删的（都是间接或运行时需要）。
所以这轮的收益主要在：合并有细微差异的重复实现、收窄多余导出、拆分逻辑过长的页面，以及两处原图内存修复。

## 改动

| 提交 | 内容 |
| --- | --- |
| `83a7bc5` | 删除 `HandoffStartQuery`、`EpisodeProgressChange` 两个死类型，以及没有被引用的 `global.css`、`types/styles.d.ts` |
| `402de86` | 新增只读工具 `scripts/report-unused-exports.mjs`：把导出分为「无引用 / 仅本文件使用 / 仅测试使用」 |
| `d6e60e1` | 去掉 79 个只在本文件使用的 `export`（59 个文件），路由文件没有改动 |
| `a4f353e` | `secureImage`、`isRecord` 两份相同实现合并；Bangumi 图片函数集中到 `infrastructure/bangumi/images.ts` |
| `a729fff` | 性能检查默认基线改为 2026-10-26 Release 冷启动（79 / 93 / 127 ms）；旧 iPhone 17 Pro 基线保留作历史 |
| `d2466d6` | **修复**：条目详情头图从原图改用 Bangumi 800 px `medium`，最近浏览同样记录缩略图，全屏查看仍是原图 |
| `fadf82b` | 设计 token「只减不增」计数检查，接入 `test:tooling`（CI 已运行） |
| `197bde6` | API 五个抓取器的 HTML 工具合并到 `apps/api/src/bangumi-html.ts` |
| `9e8d02e` | 条目详情路由拆分：498 → 289 行 |
| `11bf24d` | 剧集路由拆分：468 → 337 行 |
| `c6bc726` | 首页三块区域移到 `features/home`：577 → 175 行 |

保持现状的：`formatCount`（空值文案与小数位不同）、`formatAirDate`（「时间待定」和「放送时间待定」）两组实现不一致，没有合并；
`useThemedStyles` / `createStyles` 的 110 处写法按「明确不做」不统一。

## API 抓取工具合并的验证

五份 `decodeHtml` 有三种行为：`blogs`、`people-browser`、`indexes` 相同；`wiki` 不把 `<br>` 转成空格
（`a<br>b` → `ab`）；`tags` 只解码实体、不去标签、不合并空白。合并后用显式参数保留这些差异：
`htmlToText(value, { lineBreaks: false })`、`decodeEntities(value).trim()`。
三份 `readBoundedHtml` 只差错误类型，改为传入错误工厂；`people-browser` 的图片地址规则改为包一层再调共享 `secureUrl`。

差分验证：把旧的私有实现原样复制到临时模块，与新函数在同一批输入上逐一比较。输入取自 5 个真实 Bangumi 页面
（共 95 KB）的标签间文本、滑动切片和全部 `src` / `href`：10,657 次比较 + 358 个地址，**零差异**。
新增 5 项共享函数测试；API 测试 394 项、HTML 抓取回归 31 项通过，覆盖率 94.09%。

## 条目头图内存（Release，同条件）

流程同 [Release 基线](2026-10-26-p1-baseline-release.md)：备份开发客户端，覆盖安装 Release，冷启动 → 深链进入条目 →
等 12 s 读 footprint，一轮预热 + 三轮。持久化缓存会保存映射后的数据，所以前后各用一个**从没打开过**、
封面解码大小相同（约 45 MB）的条目。

| 组 | 条目 | 封面原图 | 第 1–3 轮 | 中位数 | CG Image | CoreAnimation |
| --- | --- | --- | --- | --- | --- | --- |
| 修复前 | 602059 | 2907×4096 | 181 / 183 / 181 MB | 181 MB | 46 MB | 49 MB |
| 修复后 | 577191 | 4096×2898 | 82 / 75 / 83 MB | 82 MB | 2 MB | 3 MB |

降幅约 55%，远超波动。测完已装回开发客户端。

## 缓存版本号（未改）

`QUERY_CACHE_BUSTER` 只影响查询缓存，不碰草稿、历史和登录。但这次新增的 `thumbnailUrl` 都是可选字段，
旧缓存会回退到原图地址，页面能正常读取；按注释约定，只有旧数据读不了时才递增。递增会让所有用户 24 小时内的
缓存（包括离线可见内容）一次失效，收益只是已打开过的页面提前不加载原图，所以不改，等 24 小时自然过期。

## 验证

- `pnpm typecheck`；`pnpm test`：shared 6、mobile 413、api 394 项全过；UI 测试 453 项全过。
- `pnpm test:tooling` 通过；手机端覆盖率 93.06%（门槛 92%），API 94.09%（门槛 75%）。
- `expo export` iOS / Android / Web 均成功。
- token 检查：故意加入一处裸 `fontSize` 时失败，删除后通过；当前 fontSize 225、间距 364，没有增加。
- 指定模拟器（开发客户端）实际操作：条目页滚动出现标题条、简介折叠、章节区；点进第 1 集、讨论列表和
  「跳到最新回复」按钮正常，「下一集」切到第 2 集；首页好友动态、发现入口正常，点「排行榜」跳转成功。
  `pnpm dev:sim` 检测到 DeviceHub 接管输入，执行了已授权的 `repair-input`，数据保留。

## 环境问题（未进仓库）

- 重启后 `~/Library/Caches/sentry-react-native/` 被系统清掉，`Pods/sentry-xcframeworks` 的软链接失效，
  iOS 构建报 `Sentry/Sentry.h` 找不到；`LANG=en_US.UTF-8 pod install` 重新下载后恢复。本地 Debug 构建同样受影响，现已恢复。
- 用户中断过一次前台测量命令，之后改在后台运行。

## 边界

- 10-31 的 node-forge 复核点尚未到期，没有执行。
- 多图缩放手势、中文长文输入仍未测（后者会产生持久草稿）。
- 首页「有内容」状态仍无法覆盖（当前账号首个收藏区为空）。
