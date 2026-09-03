# Kaku 待办

> 最后更新：2026-09-04。

## 测试与优化专项（2026-09-04 交接，详见 docs/handoff-2026-09-04.md）

- [x] 三层测试补全：node:test 纯逻辑 199→344（22 个 Kaku 客户端全覆盖，mobile 行覆盖 86.3%→94.8%，CI 加 92% 门禁）；API 251→283（public-cache/HTML 客户端错误边界）；新增 jest-expo + RNTL 组件测试 41 个（`.test.tsx` 归 jest、`.test.mjs` 归 node:test 双轨）并进 CI。
- [x] 性能优化：首页按 tab 门控收藏查询（冷启动 5 请求→1，按下预取相邻 tab）；条目离线包后台落盘不再阻塞展示；条目页吐槽/评论预览滚动到底部附近才请求；17 个分页屏统一 usePagedList（memo 行 + Android/iOS 调参）；127 处 createStyles 冗余 useMemo 移除（React Compiler 已兜底）。
- [x] 代码去重：8 个本地状态卡并入共享 AppState（actionAccessibilityLabel 分离可见文案与读屏标签）；`_layout.tsx` 535→约 200 行（TITLED_SCREENS 表）；`account.tsx` 771→55 行 + features/account/ 7 个子组件；错误边界改 useTheme 修复暗色模式白屏；legacy COLORS 别名删除。
- [x] UI/UX：图片查看器甩动关闭改 withDecay 速度交接（对齐 AppSheet）；profile 菜单可中断临界阻尼弹簧；新增 PressableScale 按压弹性反馈与 SkeletonBox 骨架屏（条目页首载/首页收藏区，与真实布局同构零位移）；错误态离线感知文案 + iOS AccessibilityInfo 播报；滚动按钮选择触觉；65 处截断文本 maxFontSizeMultiplier=1.3。
- [x] Maestro 10→16 条（日历/目录/角色分区/主题切换/时间线/剧集，登录流程带门控）+ `pnpm test:smoke` + docs/testing.md 测试指南。
- [ ] **Maestro 16 条首次真机跑通**：标签均从源码核对但未实跑；预期微调 timeout/滚动（directories 的「目录」tapOn 有歧义风险、episode 门控顺序）；跑完归档 docs/test-records/。
- [ ] **argent iOS UI 验收会话**：重点走查本轮改动（按压反馈、骨架零位移、viewer 甩动、深色、离线文案），结果归档 test-records。
- [ ] **profiler 前后对比**：home 冷启动 / 条目打开 / 列表滚动（改动前基线不可补，记录当前值 + 目标）。
- [ ] **判断性 memo 清理**：非 createStyles 的 useMemo/useCallback（约 170 处）逐个判断；React Compiler 已兜底，仅代码噪音。
- [ ] **组件测试扩面**：PressableScale、Skeleton、AppSheet、分页屏行组件、use-catalog-subject（需 query mock）；注意 reanimated 组件进 jest 需先在 tests/ui/setup.ts 配 mock。
- [ ] **已知小问题**（调研发现未修，详见交接文档）：AppSheet withDecay 兜底弹簧缺 onClose 回调；query-keys 用户名规范化不一致（publicUserEntities 小写化、其余原样）；auth-redirect 循环防护仅精确匹配 /account；cached-data-notice 未加 iOS 播报（可选）。
- [ ] stretch（未承诺）：subject hero 滚动联动视差；scroll-to-top 与 scroll-nav 按钮合并；@expo/ui 评估（已装未用）。

## 设计与体验

- [x] 界面文案中文化收尾：好友动态与用户时间线的相对时间改为中文（「2 天 14 小时前」），批量观看进度改为「进度 5/12 话」不再中英混排；`formatActivityTime` 覆盖全 App 十个复用页面。
- [x] 收藏盒交互细节：收藏状态/评分选择增加 pointer-down 触感反馈；「想看状态不记录…」提示文案抽为纯函数 `collectionInactiveNotice`，修复同时有观看与阅读进度时提示丢词的问题。
- [x] 讨论页滚动导航（最终状态：全部退回「滑到底部按钮」需求之前）：小组话题、条目讨论版话题、吐槽箱、日志/长评回复恢复原有「回到顶部」按钮 + 原生标题；人物/角色评论弹层恢复居中「回到顶部」胶囊 + 点击抽屉标题回顶；单集评论页只有「回到顶部」；吐槽箱保持每页 30、无跳转触发加载。「跳到底部」按钮及其 hook、可点击标题组件已删除。条目讨论版单个回复的举报按钮保持移除（话题级举报保留）。
- [x] 评论分页加载数量：吐槽箱保持 p1 默认每页 30（曾试过调到上游上限 100，按用户要求回退）；单集评论 p1 端点无分页参数、一次返回全部（官方 spec 无查询参数，实测 limit 被忽略），条目长评列表上游上限即 20。
- [x] 制作人员页机构可点：机构与人物共用 Bangumi 编号空间，机构行现在同样可点并进入人物详情页（已对 `/v0/persons/{机构id}` 实测），保留「机构」标签。
- [x] 好友动态「发表了日志」可跳转：API 透传 p1 timeline `memo.blog` 的日志 id 与标题，动态行整体可点、日志标题高亮，点击进入日志详情页。**API worker 已于 2026-08-30 重新部署（版本 e6c37b07），待真机验证。**
- [x] 分享入口：条目页右上浮动分享按钮，日志/长评、小组话题、目录、用户主页、人物/角色页导航栏右侧分享按钮，统一调起系统分享面板并附对应 bgm.tv 主站链接（`lib/share.ts`）。
- [x] 单集/单曲页上一集/下一集：卡片底部相邻集胶囊按钮，按排序后的章节列表取邻居（集数有缺口也能正确翻页），`router.replace` 切集避免堆栈膨胀并自动回到列表顶部。
- [x] 下拉刷新补全：标签索引与维基动态两页接入共享 `AppRefreshControl`，全 App 列表页刷新体验一致。
- [x] 回到顶部按钮覆盖全部长列表：blogs、community、timeline、people、tags、directories、小组主页、目录详情、条目评论/收藏目录、用户日志/好友/时间线共 13 页接入共享 `useScrollToTopButton` hook（此前仅 browse/rankings 等 12 页有）。
- [x] 通知页只看未读：通知卡片顶部「全部/未读」分段筛选，未读 chip 实时显示数量；无未读时显示专属空态，不再与「暂时没有通知」混淆。
- [x] Kaku 图标渠道区分：保留并提亮原版 Kaku 图标；Debug/Dev/Preview 在右下角叠加 Chrome 风格大号标签，正式版无标签；旧图标（含 mask）按内容 hash 保存在 `assets/images/app-icons/legacy/`。
- [x] 富文本图片显示修复：小组话题/讨论版/单集评论/长评（日志）板块的 `[img]` 标记现在会渲染为可全屏预览的图片卡片（`parseBangumiContent` 提取图片块 + `BangumiRichBody`/`BangumiText` 渲染，长评与话题正文的适配器不再提前剥掉图片标记）。
- [x] 富文本输入增强：回复/话题/动态均可在当前光标处插入 Bangumi 官方表情或外链图片；图片入口会即时校验 URL、明确说明不会上传，并生成 `[img]外链[/img]`，工具面板使用可中断弹簧展开且遵循减少动态效果设置。上游仍无公开图片上传端点，因此不伪造 App 内上传能力。

## 暂时隐藏

- [ ] 恢复"角色与人物收藏"入口（含自己的主页与好友主页，以及人物页/角色页上的收藏按钮——2026-09-01 已把页面上的收藏按钮移除，`use-entity-collection.ts` 查询与接口层保留）。目前通过 `SHOW_ENTITY_ENTRY` 开关隐藏主页入口；待 Bangumi P1 的角色/人物收藏接口不再返回 500，并完成 iOS 与 Android 真机验证后恢复。



## 等待上游

- [ ] 加入/退出小组：Bangumi P1 公开接口没有小组成员写操作（官网靠服务端表单），前端生成的 P1 客户端（bangumi/frontend `packages/client`）中亦无对应端点。待上游开放后实现，不要臆测端点。好友添加/移除（`PUT/DELETE /p1/friends/{username}`）已按官方端点实现。
- [ ] 删除自己的动态：`DELETE /p1/timeline/{id}` 端点虽在 P1 spec 中，但官方 iOS 客户端（Bangumi-iOS）与官网均未实现删除 UI，实测返回 5xx。已移除 Kaku 的删除入口，API 路由与测试保留待上游恢复。



## Kaku 自有增值功能

- [x] 用户偏好云同步（主题部分）：「外观与同步」页（头像菜单/账户入口：跟随系统/浅色/深色）接入 `GET/PUT /me/preferences`，本地立即生效、登录后自动同步/回拉、失败显式重试；内置设备级云同步开关（系统 Switch，只存本机、关闭即闸停所有云端读写）；本地偏好存 `expo-sqlite/kv-store`，重启保持。
- [x] 推送通知：2026-09-01 全链路打通并真机双包验证收到。修复与配置：① worker 发送端补上 `Authorization: Bearer EXPO_ACCESS_TOKEN`（FCM v1 必需），缺配置时跳过发送且不推游标；② FCM v1 服务账号 key 上传 Expo 并挂到 `.debug`/`com.shqingda.kaku`/`.preview`（注意：本地跑 `eas credentials` 需带 `EAS_BUILD_PROFILE` 才能解析到对应包名，否则默认 `.debug`）；③ 真机根因是 FCM 的 MCS 长连接（`mtalk.google.com:5228`）被代理工具（FlClash TUN）弄断——服务器侧一直受理成功但设备不可达。**使用前提**：代理工具需让 GMS 的 MCS 直连（FlClash 访问控制排除「Google Play 服务」，或覆写规则 `DOMAIN-SUFFIX,mtalk.google.com,DIRECT`——后者可保住 Play 商店/结算/Gmail 等其它谷歌服务走代理）。遗留：旧 debug 安装包（08-28 前构建）无 google-services.json 报错属预期，重打即消；通知最多延迟 Cron 15 分钟轮询周期。
- [ ] 让推送在代理环境下稳定送达：根因是 FlClash TUN 下 GMS 的 MCS 长连接（`mtalk.google.com:5228`）时断时续，消息在谷歌侧排队、补投时机不可控（2026-09-01 的 #11/#12 一直未送达）。待用户在 FlClash 加覆写规则 `DOMAIN-SUFFIX,mtalk.google.com,DIRECT`（或访问控制排除「Google Play 服务」）后验证。注意：卸载重装 App 会清掉推送开关状态与 token，需要重新打开开关登记。
- [x] 离线增强：公开查询缓存之外，最近打开的 10 个条目（含章节列表）另存 30 天离线包；网络失败时明确展示离线包并提供重试，清理本机数据时一并删除。
- [x] 多设备偏好/搜索历史/最近浏览同步：主题偏好、最近搜索与最近浏览均已接入；最近浏览本地即时更新，登录后合并各设备的 10 条轻量快照，并在前台恢复、进入发现页和下拉刷新时回拉；清空操作跨设备传播，失败在设置页显式重试。设备级云同步开关会同时闸停三类云端读写。
- [ ] 小组件 / 快捷指令：
  - [x] 主屏幕快捷操作：长按图标直达每日放送、搜索、排行榜、分类浏览（iOS Quick Actions / Android App Shortcuts）。需重新打 native 包后生效。
  - [ ] iOS Widget、Android App Widget。Expo SDK 57 的 JS widget 在 iOS 26 上会空白渲染，等上游稳定后再做。
- [x] 多数据源/跨站数据增强：曾用 AniList 在条目页补评分/预告片。匹配失败或接口不可用时会在条目页正中露出「其它来源」错误卡，已整段移除，Bangumi 仍是唯一目录来源。



## 工程化增强

- [x] D1 用户偏好数据表与迁移：`user_preferences`，含 `locale` / `theme`。
- [x] API 用户偏好读写接口：`GET /me/preferences`、`PUT /me/preferences`，带鉴权与校验。
- [x] D1 定时清理：`scheduled` 仅清理已过期的 OAuth transaction、handoff、refresh session，Cron 每天 03:00；不会删除仍有效的登录会话。
- [x] 测试补充：preferences routes、maintenance cleanup。
- [x] API 鉴权/错误处理收拢：`authenticateContext` 统一返回当前 authentication 与同一 auth store；preferences、搜索历史、最近浏览、举报、通知、好友与屏蔽、collections、timeline、discussions、indexes 均已迁移。auth 自身路由仍直接使用 `authenticateRequest`，因为 store 来自同一模块的 `getStore`。
- [x] HTML 抓取监控：blogs、indexes、people、tags、wiki 首页解析为空时写入统一 `bangumi_html_parse_failure` 结构化错误日志，仅含 parser、host、path、page，不记录 HTML、查询参数或用户数据。
- [x] 共享类型包：新增 `@kaku/shared`，抽出主题/语言偏好与收藏状态常量；Bangumi 数字映射仍留在各 adapter。
- [x] KV 远程配置：新增公开 `/config`，Cache API 热缓存优先、KV 只承载低频配置；首个服务级开关可暂停偏好云同步，移动端明确降级且本机设置不受影响。KV 缺失、损坏或读取失败均返回带 `source/degraded` 的安全默认值并记录结构化告警。
- [x] 服务端限流：按客户端 IP 分读/写桶，计数写在 Cache API（公开读 180/分钟、写 40/分钟）；无 Cache 时放行。不够再评估 Durable Objects。
- [x] 更多 Maestro 端到端：排行榜、分类浏览、条目收藏盒登录提示；公开搜索与吐槽箱冒烟仍保留。真正登录、写收藏和发布仍需带会话的真机，不能在 CI 里伪造 OAuth。
- [x] CI 增加 API 覆盖率门槛：`pnpm --filter @kaku/api test:coverage` 要求行覆盖 ≥75%。
- [x] 专门的抓取回归 job：CI `scrape-regression` 跑 blogs/indexes/people/tags/wiki 解析器与空页/无关 markup 回归；不抓真实 HTML，避免把上游页面或用户数据写入产物。



## Cloudflare 免费版扩展计划（不产生费用）

- [x] D1：新增 `user_preferences` 表，免费版可用。
- [x] Cron Triggers：每天清理已过期的认证数据，免费版可用。
- [x] KV：用于低频公共远程配置，`/config` 先走 Cache API（5 分钟）再读 KV，避免每次请求消耗 KV 额度；namespace 绑定采用 Wrangler 自动配置，部署时创建，不进行高频写入。
- [x] Queues：评估后暂缓。当前用户量用 Cron 顺序投递即可，不必先上 Cloudflare Queue。
- [x] Cache API 已用：公开 `/config` 先走 5 分钟边缘热缓存，再读低频 KV 配置，避免每次请求消耗 KV 读取额度。



## 已完成

- [x] 全站深色模式：业务页面和共享组件均已接入语义配色 token，系统外观、状态栏与原生导航栏会自动同步明暗主题。最外层错误边界刻意保留独立浅色兜底，确保主题系统本身异常时仍能显示错误和重试入口。
- [x] 崩溃监控（Sentry）：项目 `kaku` 已创建；`EXPO_PUBLIC_SENTRY_DSN`（明文）、`SENTRY_AUTH_TOKEN`（敏感）、`SENTRY_ORG=shqingda` 已通过 `eas env:set` 配置到 development/preview/production 三个环境；release 构建自动上传 source map（修复过 plugin 键名 `org`→`organization`）；诊断页有「发送测试上报」按钮，测试上报已收到；Alerts 告警已配置。
- [x] 官网重设计：zh/en 双语切换、日/夜/跟随系统主题（无闪白）、正式九节隐私政策与服务条款（双语）、Header 精简（GitHub/语言/主题按钮）、FAQ 移入首页、废弃 pricing/support 页。
- [x] 隐私政策：web `/privacy` + App 内 `privacy.tsx`（关于页入口，离线可读）。
- [x] Release 自动化：
  - 本地发版脚本 `scripts/build-split-apks.sh`（不耗 EAS 额度，只打 arm64-v8a，按渠道命名 `kaku-release.apk` / `kaku-debug.apk`，debug 签名）；2026-09-01 起 dev/preview 包已整体移除（app.config、google-services.json、eas.json、图标、workflow），远程的 Firebase 应用与 Expo 凭据需在控制台手动删
  - EAS 云端 workflow `.github/workflows/release-apk.yml`（正式上架用，AAB + EAS 签名 + source map）。
- [x] UX 打磨批次：按压反馈（重试按钮/列表行/日期 tab/筛选 chip）、触控目标 hitSlop、登录后回来源页（`lib/auth-redirect.ts`）、错误文案中文化（`lib/user-error-message.ts` 替换 17 处）、私有查询重试（`shouldRetryBangumiQuery`）、收藏盒草稿丢弃确认、`/tags` `/wiki` 入口、条目标签可点、时间线发布按钮（底部居中胶囊）、回到顶部按钮（6 个长列表页）。
- [x] 分类浏览 tab 弹回 bug 修复（`browse.tsx` useEffect 依赖误含 `subjectType`）。
- [x] 项目迁移到 `/Users/shqingda/Projects/kaku`。



## 发布工程

- [x] 真机冒烟：运行 `.maestro/public-browse-smoke.yaml`（启动、搜索、打开条目、返回），作为不写远端数据的首条真机冒烟测试。Maestro MCP 已配置。真机（iPhone 17 Pro）跑通；修复：iOS 真机冷启动后 `inputText` 不可靠，改为 `setClipboard` + `pasteText`。
- [ ] 配置 Apple / Google 商店凭据并发布商店：iOS 需 App Store Connect API key（或 Apple ID 交互登录），Android 需 Google Play 服务账号 JSON；凭据就绪后分别执行生产构建与 `eas submit`。
- [ ] 商店素材：应用截图（真机/模拟器截 6 张：首页、条目详情、章节列表、收藏盒、搜索、深色模式）、商店描述文案（中英文已草拟于对话记录）、隐私政策 URL 已就绪（官网 `/privacy`）。
- [x] 通知点击跳转补全：角色（类型 5/6/25）、人物（13/26）、日志（7/8/29）通知映射为 `character`/`person`/`blog` target 并深链到对应楼层（实体页弹评论层、日志页滚动定位）；API 映射、移动端 schema 与导航均已实现并有测试，待 API worker 重新部署后真机验证。
- [x] 列表性能：browse/rankings 的 `renderItem` 改 `useCallback`、行组件 `memo`（`BrowseCard`、新增 `RankingRow`）；browse/rankings/entities/collections 统一迁移到共享 hook `useScrollToTopButton`，`onScroll` 用 ref 守卫节流（值不变时跳过 setState）。真机已滚动验证。



## 其它说明

- 定时清理只删除“已经过期”的 OAuth state、一次性 handoff 和 refresh token 已过期的 session；不会删除仍在有效期内的 Kaku 登录会话，用户不会因此每天重新登录。
- EAS 免费额度每月有限（2026-08 已用尽，9/1 重置）：期间发版走本地脚本 `bash scripts/build-split-apks.sh v1.0.9 [debug|preview|release]`（tag 用 `v<app 版本>`），正式上架等额度恢复后走 EAS。
- 可选项（决定不做）：design token 全站推广。

