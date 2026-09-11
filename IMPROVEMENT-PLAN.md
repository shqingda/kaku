# Kaku 改进计划（2026-09-11）

五个梯队 × 六个可发布批次。每批一个可独立发布的切片：实现 → `pnpm test`（node:test + RNTL）+ 类型检查 → iOS 模拟器过受影响屏 → 完整 diff 审查后 commit（不 push）。

范围决定（已确认）：覆盖全部五个梯队；**离线写队列与跨设备进度冲突单独立项**，本轮只做轻量缓解。

## 现状分析（一句话版）

项目打磨度已很高——弹簧基建（`motion.ts`）、AppSheet/图片查看器物理、错误/离线三态、a11y、暗色模式都是领先水平；真实缺口在**覆盖面与一致性**（下拉刷新只覆盖 21/33 屏、骨架屏只有 2 处、零左滑、零长按菜单）和**两个真 bug**（409 重授权无处理、暗色描边）。TODO.md 中被上游 Bangumi 阻塞的功能（角色收藏、小组、删动态、Widget）维持搁置，不纳入本轮。

---

## 批次 A：列表体验一致性（梯队①，约 1–2 天）

**A1. 12 个二级屏统一刷新控件（已完成 2026-09-11，范围修正）** — 复核发现这 12 屏在 1.1.4–1.1.6 波次中已接 `onRefresh` 下拉刷新（此前审计信息过期）；真实缺口是用的是 RN 默认灰色 RefreshControl，与全应用其余 21 屏的主题化 `AppRefreshControl`（accent 色 + surface 底）不一致。已全部统一为 `AppRefreshControl`。涉及：`subject/[id]/relations|characters|comments|indexes|reviews|review/[reviewId]|topic/[topicId]|episode/[episodeNumber].tsx`、`user/blogs|friends|collections|timeline/[username].tsx`。

**A2. 通用 `SkeletonList` 组件（核心场景已完成 2026-09-11）** — 新增 `features/shared/skeleton-list.tsx`（vertical 行骨架 / horizontal 封面卡骨架，复用 `SkeletonBox` 呼吸动画，支持读屏标签或装饰隐藏）。已替换：notifications、blogs、channel 热门区的「正在读取…」文字卡 pending 分支；首页冷启动改为「页头 + 媒体卡骨架」同构占位。待后续按同模式替换：DiscussionStatus 的 pending 分支（覆盖 reviews/comments/indexes/topic 四屏）、用户主页系列屏、episode 屏的整屏文字卡。原则：加载占位与最终内容同构，消除文字卡→内容跳版。

**A3. 恢复滚动指示器** — `use-paged-list.ts:84` 默认值改 `true`；主页 ScrollView（`index.tsx:148`）同步恢复。弹层（AppSheet）内部列表保持隐藏。

**A4. 修暗色 bug** — `scroll-to-top-button.tsx:115-119` 硬编码黑色描边改用 `colors.track`/`colors.divider`。

---

## 批次 B：按压手感与触感统一（梯队①，已完成 2026-09-11）

**B1. PressableScale 推广（已完成）** — 主封面卡（`home-media-section` MediaCard）、browse 网格卡（BrowseCard）、排行榜行（`ranked-subject-row`，同时覆盖频道页排行区）全部换成 pointer-down 缩放 + 可中断弹簧；保留按压 opacity 作为 reduce-motion 退化反馈（与首页既有用法同一约定）。

**B2. Haptics 补齐（已完成）** — 新增 warning / error / light 三种触感函数并接线：删除回复成功、删除目录成功、取消收藏成功 → warning；「全部标记已读」→ success；下拉刷新触发（`AppRefreshControl` 中央接线，全 app 生效）→ light。测试环境的 haptics 全局 mock（`tests/ui/setup.ts`）同步补齐。

**B3. browse 年份无效输入显式反馈（已完成）** — 无效年份（非 1900–2100 整数）不再静默钳制成「无筛选」：输入框下方显示错误文案（`accessibilityRole="alert"`，accent 色，与 emoji 面板报错同惯例）+ error 触感，保留键盘让用户修正；修改输入即清除错误。

---

## 批次 C：iOS 手势与菜单质感（梯队②，约 2–3 天）

**C1. 行级左滑操作（已完成 2026-09-11，动作范围修正）** — 新增共享 `SwipeableRow`（`ReanimatedSwipeable` 子路径导入，内容 1:1 跟手 + 面板按进度显现 + 弹簧速度交接；点按动作先收面板再执行）。通知行：未读行左滑「已读」（乐观更新 + selection 触感）；已读行无动作。收藏行：左滑「编辑」打开既有收藏盒 sheet（`CollectionRowEditor` 增加受控模式）——原计划的「删除」动作受 Bangumi API 限制不可行（取消收藏需跳转官网），「改状态」收敛进编辑器。

**C2. 长按 context menu 替换 Alert 菜单** — 项目已装 `@expo/ui`，优先用其原生 Menu（iOS 上是真正的 context menu，带图标与按压缩放），回退方案 `ActionSheetIOS`：
- `directory/[id].tsx:155`（目录操作）、`profile-overflow.tsx:58`、`friend-action.tsx:38-57`；
- 顺带补：搜索历史长按删除、封面长按（分享/举报）。

**C3. 内容过渡动画（已完成 2026-09-11）** — 首页收藏 tab 切换：骨架与内容区淡入 140ms（opacity-only `FadeIn`，reduce-motion 直接出现）；subject 简介展开/收起：新增共享 `ExpandableText`（与 changelog 卡片同一套 measure+spring 模式，进度 0→1、高度从当前值出发、可随时反向，reduce-motion 跳过；收起态改为高度裁切，无省略号——与 changelog 视觉语言一致）。

**C4. AppSheet 拖拽区扩展** — 下拖关闭手势从把手扩展到 heading 区（`app-sheet.tsx:253-257`），保持与内层滚动列表的手势冲突处理注释约定。

---

## 批次 D：导航层级（梯队③，约 1–2 天，仅 iOS）

**D1. iOS 大标题** — blogs/people/rankings/wiki 等长列表屏改 `headerLargeTitle`，删除屏内重复大标题（如 `blogs.tsx:56-60`「日志」出现两次）。获得原生 scroll-edge 缩放/模糊质感。

**D2. 详情页浮动标题条** — `subject/[id]` 深滚超过封面后淡入带 blur 材质的浮动标题条（复用现有材质写法；滚动监听对齐 `use-scroll-to-top-button.ts` 的模式）。

**D3. header scroll edge effect 评估** — SDK 57 已支持 `headerBlurEffect`，先在 2–3 屏试验，效果确认后再推广；Android 完全不动。

---

## 批次 E：可靠性轻量缓解（梯队④，约 1–2 天）

**E1. 409 重授权修复（真 bug，优先）** — 服务端把 Bangumi 授权失效映射为 409 `bangumi_reauthorization_required` 并删除凭据，但客户端无感知：
- `user-error-message.ts` 加 409 分支 →「Bangumi 授权已过期，请在设置中重新连接」；
- `auth-provider.tsx` 识别该错误码 → 清本地 session → 引导重新登录（复用现有登录入口与文案）；
- 补 node:test 单测（该文件已是纯逻辑，可直接测）。

**E2. 私有数据本地持久化** — `query-persistence.ts` 支持 `meta.private` 查询写入 SQLite（登出清除逻辑已有 `auth-provider.tsx:152-156`，hydration 时仅在已登录态应用）。收益：登录用户冷启动/弱网下收藏、进度、通知有 stale 数据可显示，不再是白屏 spinner。

**E3. 设计 token 增量规则** — 存量 554 处裸 `fontSize` 不做一次性迁移；立一条规则写入 AGENTS.md：新代码排版必须走 `TYPE.`/`SPACING.` token，改到哪屏顺手收敛哪屏。

---

## 批次 F：上架前补验与测试（梯队⑤，约 2–3 天，可与 C/D 并行）

**F1. 可注入离线测试** — mock `onlineManager` 实现断网/恢复注入，覆盖 CachedDataNotice、离线包 fallback（`use-catalog-subject.ts`）、E2 的私有 hydrate。

**F2. auth-provider 测试** — 刷新单飞竞态、401 重试、409 清 session 三条路径。

**F3. Android Maestro 全量实跑** — `.maestro/kaku-regression-android.yaml` 首次真实执行，修发现的平台差异；顺带完成 TODO.md 的设备补验清单（回复草稿恢复、自己收藏搜索/返回位置、release APK 烟测）。

**F4. 无障碍抽查** — 3–4 个核心屏在 AX 大字号 / VoiceOver / Reduce Motion 下的表现；修复 `numberOfLines={1}` meta 行截断（改 2 行）等发现项。

**F5. 商店素材** — 截图清单（首页、条目详情、章节列表、收藏盒、搜索、深色模式）+ 中英文商店描述初稿；凭据（ASC API key / Play 服务账号）等用户就绪后配置。

---

## 单独立项（本轮不做，记录在案）

1. **离线写队列**：所有 mutation 离线即失败（`_layout.tsx` 显式不持久化 mutation），与「进度随时记」定位有落差；
2. **跨设备进度合并**：集数进度为全量覆盖（LWW），两台设备并发标记会静默回退；且收藏+进度两次上游调用非原子；
3. **FlashList v2 迁移评估**：RN 0.86 + Reanimated 4 已强制新架构，与 FlashList v2 兼容。先用 profiler 量化单集评论页滚到底的瓶颈（JS vs UI 线程）；若确认是列表渲染瓶颈，在该屏试点（重点回归 `scrollToIndex` 楼层跳转，FlatList 特有调优参数需删除），收益确认后再评估在 `usePagedList` 消费层（26 屏）集中推广，避免单屏迁移造成两套列表行为并存；
4. **服务端**：HTML 抓取改版告警通道、rate limiter 原子性；
5. **上游阻塞**：角色/人物收藏、小组加入退出、删动态、Widget——等 Bangumi 接口恢复。

## 明确不动（避免误伤）

- `motion.ts` / AppSheet / 图片查看器的弹簧物理（教科书级实现）；
- 现有 `withTiming` 用法（都在 backdrop/reduce-motion/周期动画等语义正确场景）；
- `Alert` 用于二次确认（只改「当菜单用」的两处）；
- 首页伪 tab 信息架构（有意为之）；
- 不引 i18n 框架、不引 ESLint、不迁 `@expo/ui` 大迁移。

## 执行约定

- 严格按批次推进，每批一个可发布切片：实现 → `pnpm test` + 类型检查 → iOS 模拟器过受影响屏 → 完整 diff 审查后 commit（不 push）；
- 新动效一律复用现有 spring 参数体系（默认临界阻尼，动量场景 ratio≈0.8），每处必须同时提供 reduce-motion 路径；
- gesture/animation worklet 遵守 AGENTS.md 规则：只调模块级 `'worklet'` 函数或内联代码；
- 每批完成后把不再成立的条目从本文件划掉，保持「每种事情只看一个地方」。
