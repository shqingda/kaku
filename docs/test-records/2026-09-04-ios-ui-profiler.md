# iOS UI 验收与性能基线

> 日期：2026-09-04
> 设备：iPhone 17 Pro 模拟器（iOS 26.5）
> App：dev client `com.shqingda.kaku.debug`，已登录，系统浅色外观
> 工具：Argent 0.23.0、Maestro 2.8.0、iOS Instruments
> 结论：视觉主路径通过；性能数据可作开发态基线，原生 hang 数据失真

## UI 验收

| 检查项 | 结果 | 证据与说明 |
| --- | --- | --- |
| 深色主题 | ✅ | 切到深色后截图，再恢复跟随系统；流程通过 |
| 条目页与骨架布局 | ✅ 可达 / ⚠️ 未量化位移 | 条目从搜索结果正常打开并稳定显示；缓存命中太快，未取得可比较的 skeleton/loading 两帧 |
| 封面图片查看器 | ✅ | 全屏打开后用 220ms 向下甩动，查看器关闭并回到条目页 |
| 发现区 press-in | ⚠️ 工具阻塞 | Argent 可读 AX/React 树，但 tap/swipe 未送达 App；中途截图也被排队到 touch-up 后。代码与组件测试仍覆盖 pointer-down 弹簧契约，本次没有新增肉眼证据 |
| 离线文案 | ⚠️ 未切断网络 | iOS 模拟器没有可安全隔离且不影响宿主 Metro 的断网开关；未以修改整机网络为代价强测。已有错误状态与文案测试继续覆盖 |

可见验收补充 flow 用 Maestro 执行，25 秒通过（0 failure）。截图目录：
`~/.maestro/tests/2026-09-04_142351/Kaku iOS visual acceptance/takeScreenshot/`，
包含 `settings-dark.png`、`settings-system.png`、`subject-loaded.png` 和
`subject-cover-viewer.png`。

## React 性能基线

固定路径：复位首页（采集前）→ 搜索「葬送的芙莉莲」→ 打开条目 → 滚动到
角色入口 → 打开角色页 → 返回。采集 47.96 秒，共 68 个 React commits，
捕获 10,825 次 fiber render；16 个 commit 达到 16ms 开发态阈值。

| 场景 | 当前值 | 解释 / 后续目标 |
| --- | --- | --- |
| 条目页首次挂载 | 93.06ms | 开发态粗略折算生产约 31ms；目标是避免后续数据到达再次整页级联 |
| 收藏盒/剧集数据到达 | 29.50ms | `CollectionBoxSheet` 挂载 9.22ms self；当前可接受，后续可延迟挂载关闭态 sheet |
| 角色页首次挂载 | 125.04ms | 77 个组件、首批 10 个 cell；本次最慢 commit |
| 角色列表后续批次 | 56.71–81.33ms | 每批约 7–10 个 cell，主要为 `CellRenderer` 与 25–54 个 Link；下轮优先核对批量窗口和 Link 包装成本 |

React 报告称编译器全局标记不可用，但组件条目可识别出若干
`[React Compiler]`；因此不能据此恢复大批 `useMemo/useCallback`，仍按逐项判断原则。

## 原生采集说明

关联报告显示 9 个所谓 UI hang（5.4–22.4 秒），全部没有 React commit 匹配；
下钻也没有返回主线程调用栈，线程统计还混入旧 Kaku 进程 PID。同期 Maestro
持续完成点击、滚动和断言，因此这些 hang 判定为 Instruments/模拟器采集失真，
不能归因到产品。可信结论仅为本次未发现可归因的 native leak（0 个）。

## 复测入口与原始证据

- 复位：`.maestro/kaku-reset-ios.yaml`
- 固定交互：`.maestro/kaku-profile-ios.yaml`
- React session：`20260904-062127`
- React 报告：`/var/folders/xt/kzh0y_2501gbt90v1813y8280000gn/T/argent-profiler-cwd/react-profiler-report.md`
- Native 报告：`/var/folders/xt/kzh0y_2501gbt90v1813y8280000gn/T/argent-profiler-cwd/native-profiler-20260904-062056-report.md`
