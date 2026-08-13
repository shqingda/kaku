# Kaku 待办

## 暂时隐藏

- [ ] 恢复“角色与人物收藏”入口（含自己的主页与好友主页）。目前通过 `SHOW_ENTITY_ENTRY` 开关全部隐藏，相关页面、查询和接口均保留；待 Bangumi P1 的角色/人物取消收藏接口不再返回 500，并完成 iOS 与 Android 真机验证后恢复。

## 等待上游

- [ ] 加入/退出小组：Bangumi P1 公开接口没有小组成员写操作（官网靠服务端表单），前端生成的 P1 客户端（bangumi/frontend `packages/client`）中亦无对应端点。待上游开放后实现，不要臆测端点。好友添加/移除（`PUT/DELETE /p1/friends/{username}`）已按官方端点实现。
- [ ] 删除自己的动态：`DELETE /p1/timeline/{id}` 端点虽在 P1 spec 中，但官方 iOS 客户端（Bangumi-iOS）与官网均未实现删除 UI，实测返回 5xx。已移除 Kaku 的删除入口，API 路由与测试保留待上游恢复。

## 已完成

- [x] 全站深色模式：业务页面和共享组件均已接入语义配色 token，系统外观、状态栏与原生导航栏会自动同步明暗主题。最外层错误边界刻意保留独立浅色兜底，确保主题系统本身异常时仍能显示错误和重试入口。

## 发布工程

- [ ] 接入崩溃监控与可读 source map。需要先创建 Sentry 项目，并将 DSN 与 source-map 上传 token 分别按公开配置和敏感构建变量管理，禁止提交 token。
- [ ] 安装 Maestro 后运行 `.maestro/public-browse-smoke.yaml`，把“启动、搜索、打开条目、返回”作为不写远端数据的首条真机冒烟测试。
- [ ] 配置 EAS preview / production 构建、签名与商店发布流程。
