# v1.1.8 发布验收

日期：2026-09-18。Android 实机按用户要求暂缓；模拟器为 iPhone 18 Pro / iOS 27.0，使用已有 dev client + 当前 Metro JS。

## 自动化

- `pnpm test`：658 条通过（shared 3、mobile 365、API 290）。
- `pnpm test:ui --runInBand`：28 套件、130 条通过。
- `pnpm typecheck`：所有工作区通过。
- `pnpm test:performance`：2 条通过；这是检查脚本的测试，不是新性能采样。
- API 覆盖率 92.74%，移动端 Node 测试覆盖率 94.59%，均通过仓库门槛。
- Expo SDK 57 补丁依赖更新后，`expo install --check` 与 iOS/Android JS 导出通过。
- `pnpm build:web` 通过。

路由集成使用真实 Expo Router，详情页使用参数探针，登录面板与无效链接页使用实际组件；不覆盖真实 OAuth 浏览器。通知组件使用真实 QueryClient/onlineManager，替换 HTTP 与原生行导航，覆盖离线卸载/重挂/恢复、筛选、失败回滚及缓存重试。首页收藏区、条目评论区和收藏盒补 3 条行为测试；不声称覆盖所有整屏交互组合。

## iOS 与素材

- `.maestro/kaku-regression-ios.yaml` 全量通过。修复更新日志 1.1.1 卡片滚出屏幕后直接点击的脆弱选择器。
- `.maestro/store-screenshots-ios.yaml` 通过，6 类截图已在本机采集；商店素材说明见 `../store/listing.md`。开发控件及真实账号内容使这批素材只适合作候选参考，不会上传。
- 大字体专项检查中发现冒烟登录分支依赖入口可见性，已修正为先滚入视野并先处理未登录入口；复跑结果后补。
- 上述全量初次通过发生在 Expo 补丁更新之前；补丁更新后已重启 Metro，正在补验。已有 iOS 原生 dev client 不是新 production 构建。

## 发布与限制

- D1 远端 `migrations list`：无待迁移；不修改 schema。
- API 要先于客户端发布。具体 Worker 版本、Release URL 与 APK 校验值在发布后补记。
- 双真机推送、Android APK 冷启动/Sentry/覆盖安装、真实多账号授权、VoiceOver 实际读屏与新 React profiler 采样尚未完成；TODO 保留原因。
