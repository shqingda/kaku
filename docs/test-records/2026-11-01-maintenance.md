# 维护、可靠性与体验整理（2026-11-01）

实施范围见 [计划](../plans/2026-11-01-maintenance.md)，剩余设备与外部条件见 [TODO](../../TODO.md)。
本轮保留现有产品功能、数据库结构、HTTP 成功响应及本地存储格式，`tutorial/` 排除。
修复、纯重构、依赖更新分别提交；未推送、部署或发布。

## 已完成切片与保护行为

| 工作 | 结果与验证 |
| --- | --- |
| 工具测试 | 移除 Expo CLI 58.1.15 的失效 Zod override 与引用已不存在私有文件的测试；工具测试恢复通过，node-forge 签名回归保留 |
| 云历史 | 最近浏览、搜索历史遇到坏 JSON、非数组或非法项时走既有 `500 internal_error`；D1 原值和本机历史不动；合法空记录、无记录和旧数据保留原语义 |
| CI 去重 | shared 普通测试一次、API/mobile 各带覆盖率一次；HTML 用例仍在 API 全量中，保留专项入口；75%/92% 门槛不变，失败立即停止 |
| 无用实现 | 删除离线清单/单项删除、诊断清除等旧入口专用方法和死导出，测试改从现存存储入口验证；后台缓存、错误记录、清缓存保护继续保留 |
| 收藏控件 | 删除不可达的旧取消保存分支，现有取消收藏外链及确认行为保留 |
| 列表状态 | 排行榜、每日放送、探索概览/搜索、分类、人物、日志、标签、目录、维基、好友动态、小组/讨论及条目吐槽/评论/目录区分加载/暂停/失败/空结果；刷新失败保留内容，元数据和列表独立重试；翻页不打断刷新 |
| 入口修复 | 标签手动分类不再被原路由反复回写；游客好友动态深链复用登录门控，记住返回位置，会话失效立即隐藏私有列表 |
| 图片状态 | 全屏与正文图增加加载、失败、重试及关闭/查看大图入口；URL、重试和关闭重开隔离迟到回调；进行中的保存仍归属原 URL，重复保存单飞，临时文件清理保护保留。相关组件与保存回归 27 项通过 |
| 文字与无障碍 | 简介按原生行位置和完整高度折叠，不再用字符数猜测；宽度/字号/文本变化拒绝旧测量，弹簧可反向接管，减少动态效果时直接更新。相关组件 13 项通过；页脚只在错误状态变化时播报，按钮最小触控区与换行布局同步调整 |
| 架构 | shared 最近浏览类型/判定共用，API 严格读取与本机兼容各自保留；中立正文块与 Bangumi BBCode 解析分离，既有解析/映射 22 项回归通过 |

## 测试删改对应的保护去向

| 原测试/断言 | 调整后的保护 |
| --- | --- |
| Expo CLI 私有 Zod schema 文件断言 | 旧补丁与私有文件已不存在，删除此断言；冻结安装、Expo 依赖检查、doctor、导出仍校验工具链 |
| Skeleton 样式透传 | 删除实现镜像断言；业务页继续验证加载状态、失败状态和内容恢复 |
| 刷新控件样式 | 改验真实刷新回调和一次触觉，避免只检查传入 props |
| 滚动按钮重复场景 | 通过真实组件合并验证回顶部、到底部与隐藏按钮行为 |
| 性能历史数字锁定 | 删除对历史基线固定数值的依赖；保留计算、样本、环境匹配检查；旧三轮测量记录保留，不声称本轮有性能收益 |
| 旧离线清单/诊断清除导出 | 通过存储公开入口保护并发、失效、损坏读取与恢复，不为死方法保留测试 |
| 更新日志旧版本文案 | 共用 `changelog-checks.yaml`，用稳定 ID 验证最新版默认展开、重开和 v1.1.24 历史可访问 |
| 默认回归中的主题切换 | 独立专项记录原主题并在 `onFlowComplete` 恢复；默认套件不切换，商店截图复用只读流程；新增流程设备实跑另列 |

认证、账号隔离、草稿、同步、并发、迁移、签名、手势中断测试继续保留。
新增云历史回归从真实 D1/GET 与移动端 Provider 验证损坏不清空、合法空历史可同步；
新增页面回归验证暂停、恢复、刷新失败保留和正确查询重试，不能代替系统断网实测。

## 依赖决策

| 组 | 采用/保留与原因 |
| --- | --- |
| node-forge | 1.4.0 → 1.4.2，移除本地 patch 和空补丁目录，保留攻击样本签名回归。维护者确认官方 1.4.1 通过规范化 DigestInfo 修复，1.4.2 发布于 10-27，超过 24 小时等待期 |
| 官网 React / react-dom | 19.3.0 → 19.3.1，10-14 发布的稳定补丁；官网构建通过。官方说明主要涉及 RSC transport，本官网不使用 RSC，不宣称性能或功能收益 |
| Workers 类型 | 5.20261030.1 → 5.20261031.1（10-31 00:56 UTC 发布）；API 类型检查和 Wrangler types 生成通过，生成声明语义无变化；11-01 当日新版本不跨等待期采用 |
| SDK 58 | 移动端继续 React 19.3.0 / Sentry 8.28.0 / Worklets 0.13.0 / Gesture Handler 3.3.0 / Safe Area 5.10.1，按安装的 `bundledNativeModules.json` 配套，未逐包追最新或加兼容忽略 |
| 依赖分类 | 官网 Vite、React 构建插件、仅类型引用的 shared 移入 devDependencies；这是职责分类，不是安装包体积收益 |
| 发布时间规则 | 显式 `minimumReleaseAge: 1440` 与 `minimumReleaseAgeExcludePrune: true`；292 条旧精确豁免中删除锁文件未用的 240 条及已超过 24 小时的 37 条，保留此前已授权、最终复核时（11-01 10:18 UTC）未满 24 小时的 15 条 Expo 补丁；未加通配放行 |
| override | 删除无依赖路径的 Undici 8.x 规则；保留实际用于 Miniflare 的 sharp 0.35.5、Sentry CLI 的 Undici 6.29.1、Miniflare 的 Undici 7.30.1、esbuild-kit 的 esbuild 0.25.12，以及 React DOM 类型一致性约束 |

锁文件的新增 peer 快照逐项核对，包本体只增加本组目标版本；mobile importer 完全不变。
实际模块解析：mobile React/DOM 19.3.0，web React/DOM 19.3.1。保留 Miniflare 测试运行时、
RNTL renderer、Expo 配置/构建插件，未按表面 import 搜索大批删除依赖。

原始 `pnpm audit --json`：**0 critical / 0 high / 2 moderate / 1 low**，仍以非零退出，未增加忽略项：

| 项目 | 实际依赖与处理 |
| --- | --- |
| [deepmerge](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)，low | Jest 配置合并路径，公告无修复版；保留并跟踪 |
| [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249)，moderate | Expo 构建工具 → glob，修复要求 ≥11.0.1；不强制跨大版本 |
| [glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)，moderate | Expo 配置/Metro、Jest 文件遍历，修复要求 ≥14.0.2；等待上游兼容更新 |

这三项位于构建/测试链，未据此宣称运行环境没有风险。现有 peer 提示也保留：
Drizzle 的可选 Expo SQLite 路径带入 RN CLI 要求 Metro Config 0.88.1、实际 0.88.0；
quick-actions 构建插件链的旧 `@expo/require-utils` 声明 TypeScript 5.x，工程采用 7.0.2。

官方依据：[forge 维护者说明](https://github.com/digitalbazaar/forge/pull/1152#issuecomment-6434865685)、
[React 19.3.1](https://github.com/react/react/releases/tag/v19.3.1)、
[Expo 升级流程](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)、
[pnpm 发布时间设置](https://pnpm.io/settings/dependency-resolution#minimumreleaseage)。
版本时间以 npm registry 的对应版本发布记录复核。

## 上游兼容复核

- Sentry Router 路径问题已由上游 8.33.0 修复（[#6901](https://github.com/getsentry/sentry-react-native/issues/6901)），
  本仓仍跟随 SDK 58 的 `~8.28.0`，没有把“上游修好”当作本应用已经采用；可选集成警告继续保留。
- expo-sqlite 已是 58.0.15，Web `open_v2` 仍使用异步 cwrap 的栈字符串参数模式；本轮仅复核源码，
  未重新清空 OPFS 或复现运行时存储故障。历史推断与独立官网边界仍以 [原记录](2026-10-26-compat-gaps.md) 为准。
- quick-actions 仍为 6.0.2，其构建插件与旧 TypeScript peer 声明继续跟踪，未增加 ignore。

## 整轮自动化与构建

各片先运行关联测试和类型检查；源码收口后执行一次完整 `pnpm ci:check`，退出码 0：

| 检查 | 结果 |
| --- | --- |
| 冻结安装、Expo 配套检查 | 通过，未改变 mobile importer 或原生包版本 |
| Expo Doctor | 20/20，通过 |
| 工作区类型检查 | shared、API、mobile、web 全部通过 |
| shared | 6/6 |
| 工具 | Node 32/32、Python 9/9；保留官方 node-forge 的安全回归 |
| API | 397/397，行覆盖率 94.20%，门槛仍为 75%；包含 HTML 解析用例 |
| mobile 逻辑 | 413/413，行覆盖率 92.81%，门槛仍为 92% |
| mobile 组件 | 78 suites、522/522 |
| JS 导出与官网 | iOS、Android 导出及 Vite 官网构建通过；没有原生 APK/IPA 构建 |
| 样式守护 | 基线收紧为 fontSize 171、spacing 280；本轮触及的源文件未残留守护范围内的裸值 |
| Maestro 静态检查 | 35 份 YAML 与子流程引用通过；不等同于设备执行 |
| 文档链接 | 14 份修改/新增文档，203 个本地链接与 1 个锚点均有效 |

导出仍出现 SDK 58 Router `build/hooks`、Sentry `router-store` 导出路径的兼容回退警告；
构建成功不表示这些上游警告已消失。没有降低覆盖门槛或追加忽略规则。
预检后仅再删除刚满 24 小时的 3 条精确版本豁免；锁文件无变化，供应链策略与冻结安装复核通过，未重复执行无关测试。

## 设备与发布边界

先列设备，仅复用指定 iPhone 18 Pro / iOS 27.0；通过 `pnpm dev:sim` 启动，
PosterBoard 保持停用。已提醒用户由本人重新登录，本轮没有进行 OAuth 或鉴权写入测试。
通过 Codex 内置浏览器真实点击与拖动，手动验证账户 → 关于 → 更新日志路径、
v1.1.25 默认展开、收起后重开，以及 v1.1.24 历史展开可读；并据此修正两个旧 Maestro 入口。

本机 `maestro` 命令不存在（退出码 127），新流程未实际运行。图片多指手势、动画中接管、
系统字号/读屏、弱网恢复、独立外观切换恢复、真实发送和双设备等仍按 TODO 待验，
组件事件模拟不能替代这些设备结果。

Android 实机继续暂缓；本轮未触发 Android CI、未生成或交付 APK。未清空应用数据、
草稿、历史或钥匙串。历史发布记录和 v1.1.24 起更新日志保留。
`tutorial/` 文件清单及逐文件摘要与开始前完全一致，未计入整理成果。
全部改动按片提交在本地 `codex/maintenance-2026-11-01`；未推送、部署或正式发布。
