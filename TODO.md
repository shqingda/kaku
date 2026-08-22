# Kaku 待办

> 最后更新：2026-08-20。

## 暂时隐藏

- [ ] 恢复“角色与人物收藏”入口（含自己的主页与好友主页）。目前通过 `SHOW_ENTITY_ENTRY` 开关全部隐藏，相关页面、查询和接口均保留；待 Bangumi P1 的角色/人物取消收藏接口不再返回 500，并完成 iOS 与 Android 真机验证后恢复。

## 等待上游

- [ ] 加入/退出小组：Bangumi P1 公开接口没有小组成员写操作（官网靠服务端表单），前端生成的 P1 客户端（bangumi/frontend `packages/client`）中亦无对应端点。待上游开放后实现，不要臆测端点。好友添加/移除（`PUT/DELETE /p1/friends/{username}`）已按官方端点实现。
- [ ] 删除自己的动态：`DELETE /p1/timeline/{id}` 端点虽在 P1 spec 中，但官方 iOS 客户端（Bangumi-iOS）与官网均未实现删除 UI，实测返回 5xx。已移除 Kaku 的删除入口，API 路由与测试保留待上游恢复。

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

- [ ] 真机冒烟：运行 `.maestro/public-browse-smoke.yaml`（启动、搜索、打开条目、返回），作为不写远端数据的首条真机冒烟测试。Maestro MCP 已配置。
- [ ] 配置 Apple / Google 商店凭据并发布商店：iOS 需 App Store Connect API key（或 Apple ID 交互登录），Android 需 Google Play 服务账号 JSON；凭据就绪后分别执行生产构建与 `eas submit`。
- [ ] 商店素材：应用截图（真机/模拟器截 6 张：首页、条目详情、章节列表、收藏盒、搜索、深色模式）、商店描述文案（中英文已草拟于对话记录）、隐私政策 URL 已就绪（官网 `/privacy`）。
- [ ] 通知点击跳转补全：角色/人物/日志类通知目前点了不跳转。
- [ ] 列表性能：长列表 `renderItem` 改 `useCallback` + 行组件 `memo`（browse/rankings 受益最大），`onScroll` 的 setState 节流。

## 其它说明

- EAS 免费额度每月有限（2026-08 已用尽，9/1 重置）：期间发版走本地脚本 `bash scripts/build-split-apks.sh android-1.0.0-<n>`，正式上架等额度恢复后走 EAS。
- 可选项（决定不做）：design token 全站推广。
