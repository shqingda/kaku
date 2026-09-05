# Kaku 待办

> 最后更新：2026-09-05。只留还有效的事项。
>
> GitHub 日常包 `v1.1.6` 已发出。iOS Maestro 全量和性能基线在 `docs/test-records/`。

## 设备补验

- [ ] 回复草稿：关开弹层、杀进程恢复、发送失败保留、发送成功清除与账户隔离。
- [ ] 自己的收藏：搜索输入/清空、非首屏命中、返回位置与离线恢复。
- [ ] Android Maestro 全量入口还没实跑（`.maestro/kaku-regression-android.yaml`）。
- [ ] 最终 release APK 冷启动烟测：登录/深链、通知权限、Sentry、覆盖或卸载安装。

## 测试

- [ ] 用 `expo-router/testing-library` 补路由集成测试：登录回跳、深链、嵌套路由、返回栈、无效路径。
- [ ] 补首页、条目详情、收藏盒、评论、登录、通知筛选等业务屏幕的数据状态与用户行为组件测试。
- [ ] 增加可注入的离线/恢复联网测试。不要靠切断 Mac 网络。
- [ ] 补大字体、VoiceOver、Reduce Motion、Reduce Transparency 和触控区域验收。
- [ ] 把首页和角色列表已有的 profiler 基线变成可重复的性能回退阈值。

## 商店

- [ ] 配置 App Store Connect API key 和 Google Play 服务账号，凭据就绪后执行 production 构建与提交。
- [ ] 准备商店截图：首页、条目详情、章节列表、收藏盒、搜索、深色模式；整理中英文商店描述。

## 产品与上游阻塞

- [ ] 让 Android 推送在代理环境下稳定送达：为 GMS 的 `mtalk.google.com:5228` 配置直连后重新验证。
- [ ] 恢复角色/人物收藏入口：等待 Bangumi P1 收藏接口不再返回 500。
- [ ] 加入/退出小组：等待 Bangumi 提供公开写接口。
- [ ] 删除自己的动态：等待 `DELETE /p1/timeline/{id}` 不再返回 5xx。
- [ ] iOS/Android Widget：等待 Expo SDK 57 的 iOS 26 Widget 空白问题稳定后再评估。

## 明确不做

- 不在首页卡片上做快捷记进度。进度仍在条目详情和章节列表完成。
- 不引入 ESLint。
- 不同时维护 Detox/Appium；继续 Jest/RNTL + Maestro。
- 不为每次 PR 在 GitHub Actions 跑完整 Maestro。
- 不做无明确收益的 Hero 视差。
- 不为“已安装未使用”迁移到 `@expo/ui`；出现真正需要系统原生控件的页面时再采用。
- 不为信息类 `cached-data-notice` 增加重复 VoiceOver 播报。
- 不把判断性 `useMemo`/`useCallback` 清理当成待办；React Compiler 已兜底。
