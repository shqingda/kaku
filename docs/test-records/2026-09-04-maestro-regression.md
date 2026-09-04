# Maestro 全量回归：16 条 iOS 流程

> 日期：2026-09-04
> 设备：iPhone 17 Pro 模拟器（iOS 26.5）
> App：dev client `com.shqingda.kaku.debug`，Metro 8081
> 工具：Maestro 2.8.0
> 结论：**通过**，16 条业务流程由单一平台入口串行执行

## 运行结果

执行 `.maestro/kaku-regression-ios.yaml`，总耗时 234.575 秒（3 分 55 秒），
JUnit 结果为 1 个入口 flow、0 failure。入口依次包含基础 smoke 与 12 个独立
业务 flow；嵌套断言全部通过。

覆盖首页、账户与更新日志、网络诊断、公开浏览、条目详情、吐槽、角色与声优、
剧集门控、搜索清空、排行榜、频道分类、每日放送、目录、深色主题、好友动态和
收藏盒登录态门控。

## 首次实跑修正

- 多个 flow 不能并发争用同一台模拟器，改为平台入口顺序 `runFlow`。
- Maestro 2.8.0 的嵌套 `openLink` 不继承 `${APP_ID}`，因此平台入口保留真实
  bundle id，子流程使用占位 appId。
- iOS 无障碍树要求完整容器标签，修正角色分区、吐槽和分类浏览选择器。
- 搜索清空同时兼容 iOS `Clear text` 与 Android 中文标签；本轮仅执行 iOS。
- 剧集与收藏盒流程改为登录态双分支，不进行远端写入。

## 证据

- JUnit：`/tmp/kaku-maestro-ios.xml`
- 入口：`.maestro/kaku-regression-ios.yaml`
- 共用复位：`.maestro/reset-home.yaml`
- Android 平台入口已补齐但按约定未执行。

## 续接复跑

角色列表导航改为直接调用 Router 后，`subject-sections` 增加了“打开首个角色 →
进入角色详情 → 返回角色列表”的断言。更新后的 iOS 全量入口再次通过，耗时
3 分 57 秒，JUnit 为 1 个入口 flow、0 failure；结果写入
`/tmp/kaku-maestro-ios-final.xml`。Android 仍未执行。
