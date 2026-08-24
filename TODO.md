# Kaku 待办

> 最后更新：2026-08-24。

## 设计与体验

- [ ] Kaku 图标重新设计：遵从 apple-design，浅色/深色两套主题，外部背景为白色/黑色，内部图标基于 Bangumi 主题色；旧图标（含 mask）必须保留，选用两套不同 hash 不互相覆盖。
- [x] 富文本图片显示修复：小组话题/讨论版/单集评论/长评（日志）板块的 `[img]` 标记现在会渲染为可全屏预览的图片卡片（`parseBangumiContent` 提取图片块 + `BangumiRichBody`/`BangumiText` 渲染，长评与话题正文的适配器不再提前剥掉图片标记）。
- [ ] 富文本输入增强：写评论/话题/回复时支持插入图片与 Bangumi 官方表情。上游没有公开上传端点，难度较大，先设计/验证方案再动手（不要臆测端点）。

## 暂时隐藏

- [ ] 恢复“角色与人物收藏”入口（含自己的主页与好友主页）。目前通过 `SHOW_ENTITY_ENTRY` 开关全部隐藏，相关页面、查询和接口均保留；待 Bangumi P1 的角色/人物取消收藏接口不再返回 500，并完成 iOS 与 Android 真机验证后恢复。

## 等待上游

- [ ] 加入/退出小组：Bangumi P1 公开接口没有小组成员写操作（官网靠服务端表单），前端生成的 P1 客户端（bangumi/frontend `packages/client`）中亦无对应端点。待上游开放后实现，不要臆测端点。好友添加/移除（`PUT/DELETE /p1/friends/{username}`）已按官方端点实现。
- [ ] 删除自己的动态：`DELETE /p1/timeline/{id}` 端点虽在 P1 spec 中，但官方 iOS 客户端（Bangumi-iOS）与官网均未实现删除 UI，实测返回 5xx。已移除 Kaku 的删除入口，API 路由与测试保留待上游恢复。

## Kaku 自有增值功能

- [x] 用户偏好云同步（主题部分）：「外观与同步」页（头像菜单/账户入口：跟随系统/浅色/深色）接入 `GET/PUT /me/preferences`，本地立即生效、登录后自动同步/回拉、失败显式重试；内置设备级云同步开关（`@expo/ui` Switch，只存本机、关闭即闸停所有云端读写）；本地偏好存 `expo-sqlite/kv-store`，重启保持。
- [ ] 用户偏好云同步（locale）：`locale` 字段暂未接入移动端，需要先有 i18n 基建；API 与 D1 已支持。
- [ ] 本地/云端统计与年度报告：基于用户收藏和进度数据生成。
- [ ] 导入/导出收藏与笔记：导出 JSON/CSV，产物可放 R2。
- [ ] 推送通知：需要 APNs / FCM、用户授权，以及 Queue + Cron 轮询。
- [ ] 离线增强：当前已有公开查询缓存，可继续做条目详情/章节离线包。
- [ ] 多设备偏好/搜索历史/最近浏览同步：D1 已可承载，待移动端接入。
- [ ] 小组件 / 快捷指令：iOS Widget、Android App Widget。
- [ ] 多数据源/跨站数据增强：需要先完善领域模型抽象，暂缓。



## 工程化增强

- [x] D1 用户偏好数据表与迁移：`user_preferences`，含 `locale` / `theme`。
- [x] API 用户偏好读写接口：`GET /me/preferences`、`PUT /me/preferences`，带鉴权与校验。
- [x] D1 定时清理：`scheduled` 仅清理已过期的 OAuth transaction、handoff、refresh session，Cron 每天 03:00；不会删除仍有效的登录会话。
- [x] 测试补充：preferences routes、maintenance cleanup。
- [ ] API 鉴权/错误处理收拢：抽公共 middleware / helper，减少各 domain 重复样板。
- [ ] HTML 抓取监控：为 5 个 HTML 抓取模块增加结构化告警 / 解析失败指标。
- [ ] 共享类型包：把 mobile/api/web 共用的基础类型/常量抽到 `packages/shared`。
- [ ] KV 远程配置：公共缓存、功能开关、上游 URL 或抓取配置。
- [ ] 服务端限流：先做轻量级限流，再评估 Durable Objects。
- [ ] 更多 Maestro 端到端：登录、条目详情、收藏、发布等关键路径。
- [ ] CI 增加覆盖率门槛或专门的抓取回归 job。



## Cloudflare 免费版扩展计划（不产生费用）

- [x] D1：新增 `user_preferences` 表，免费版可用。
- [x] Cron Triggers：每天清理已过期的认证数据，免费版可用。
- [ ] KV：公共列表 / 远程配置缓存，免费版有读写额度，注意控制 TTL 与写入频率。
- [ ] R2：导出文件、报告、抓取快照，免费版有容量，仅按需使用。
- [ ] Queues：批量刷新、推送通知、导出任务，免费版有配额，需评估用量。
- [ ] Cache API 已用：继续作为边缘热缓存，优先于 KV 写。
- [ ] Durable Objects：暂缓，免费版限制/复杂度较高，不是当前瓶颈。
- [ ] Browser Rendering：暂缓，可能超出免费版合理用量且不一定必要。



## 已完成

- [x] 全站深色模式：业务页面和共享组件均已接入语义配色 token，系统外观、状态栏与原生导航栏会自动同步明暗主题。最外层错误边界刻意保留独立浅色兜底，确保主题系统本身异常时仍能显示错误和重试入口。
- [x] 崩溃监控（Sentry）：项目 `kaku` 已创建；`EXPO_PUBLIC_SENTRY_DSN`（明文）、`SENTRY_AUTH_TOKEN`（敏感）、`SENTRY_ORG=shqingda` 已通过 `eas env:set` 配置到 development/preview/production 三个环境；release 构建自动上传 source map（修复过 plugin 键名 `org`→`organization`）；诊断页有「发送测试上报」按钮，测试上报已收到；Alerts 告警已配置。
- [x] 官网重设计：zh/en 双语切换、日/夜/跟随系统主题（无闪白）、正式九节隐私政策与服务条款（双语）、Header 精简（GitHub/语言/主题按钮）、FAQ 移入首页、废弃 pricing/support 页。
- [x] 隐私政策：web `/privacy` + App 内 `privacy.tsx`（关于页入口，离线可读）。
- [x] Release 自动化：
  - 本地发版脚本 `scripts/build-split-apks.sh`（不耗 EAS 额度，产出 4 个 per-ABI APK 50-62MB，debug 签名）；
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
- EAS 免费额度每月有限（2026-08 已用尽，9/1 重置）：期间发版走本地脚本 `bash scripts/build-split-apks.sh android-1.0.0-<n>`，正式上架等额度恢复后走 EAS。
- 可选项（决定不做）：design token 全站推广。

