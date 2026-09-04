# Kaku 待办

> 最后更新：2026-09-04。只保留尚未完成且仍然有效的事项。
>
> iOS Maestro 16 条、Argent 视觉验收和性能基线已归档在 `docs/test-records/`。
> 当前最大缺口在设备和发布端，而不是再堆单元测试数量。

## 测试与发布质量

按优先级：

- [ ] 使用 `expo-router/testing-library` 补路由集成测试：登录回跳、深链参数、嵌套路由、返回栈、无效路径和登录态重定向。
- [ ] 在 Android 模拟器实跑 Maestro 全量入口（`.maestro/kaku-regression-android.yaml`）：安装启动、返回键、键盘输入、列表滚动、权限和深链。流程文件已存在，但还没有实跑。
- [ ] 安装最终 release APK（非 dev client）做发版烟测：冷启动、登录/深链、通知权限、Sentry 是否上报、覆盖或卸载安装。bundle 能生成不等于最终安装包可运行。
- [ ] 将 3–5 条关键 Maestro smoke 接入发版前或定时门禁；完整 16 条继续作为本地/发版前回归。不要为每次 PR 消耗 EAS 额度。
- [ ] 补首页、条目详情、收藏盒、评论编辑/删除、登录流程、通知筛选等业务屏幕的数据状态与用户行为组件测试。共享层 72 项已覆盖，不追求全页面快照。
- [ ] 增加可注入的离线/恢复联网测试：缓存展示、恢复后刷新、请求取消、晚到响应不覆盖新状态。不要靠切断 Mac 网络。
- [ ] 补大字体、VoiceOver 焦点顺序、Reduce Motion、Reduce Transparency 和触控区域验收。
- [ ] 为少量关键页面建立稳定视觉基准；把首页和角色列表已有的 profiler 基线变成可重复的性能回退阈值。

## 发版与商店

- [ ] 发布 GitHub `v1.1.5`：提升 App 版本、撰写本次 Release Notes、构建 release APK、安装烟测并创建 GitHub Release。`v1.1.4` 已发布。
- [ ] 配置 App Store Connect API key 和 Google Play 服务账号，凭据就绪后执行 production 构建与提交。
- [ ] 准备商店截图：首页、条目详情、章节列表、收藏盒、搜索、深色模式；整理中英文商店描述。

## 产品与上游阻塞

- [ ] 让 Android 推送在代理环境下稳定送达：为 GMS 的 `mtalk.google.com:5228` 配置直连后重新验证。
- [ ] 恢复角色/人物收藏入口：等待 Bangumi P1 收藏接口不再返回 500，并完成 iOS/Android 验证。
- [ ] 加入/退出小组：等待 Bangumi 提供公开写接口。
- [ ] 删除自己的动态：等待 `DELETE /p1/timeline/{id}` 不再返回 5xx。
- [ ] iOS/Android Widget：等待 Expo SDK 57 的 iOS 26 Widget 空白问题稳定后再评估。

## 明确不做

- 不引入 ESLint。
- 不同时维护 Detox/Appium；继续 Jest/RNTL + Maestro。
- 不为每次 PR 在 GitHub Actions 跑完整 Maestro。
- 不做无明确收益的 Hero 视差。
- 不为“已安装未使用”迁移到 `@expo/ui`；出现真正需要系统原生控件的页面时再采用。
- 不为信息类 `cached-data-notice` 增加重复 VoiceOver 播报。
- 不把判断性 `useMemo`/`useCallback` 清理当成待办；React Compiler 已兜底，已做过语义审计。
