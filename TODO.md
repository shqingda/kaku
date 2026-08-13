# Kaku 待办

## 暂时隐藏

- [ ] 恢复“角色与人物收藏”入口（含自己的主页与好友主页）。目前通过 `SHOW_ENTITY_ENTRY` 开关全部隐藏，相关页面、查询和接口均保留；待 Bangumi P1 的角色/人物取消收藏接口不再返回 500，并完成 iOS 与 Android 真机验证后恢复。

## 等待上游

- [ ] 加入/退出小组：Bangumi P1 公开接口没有小组成员写操作（官网靠服务端表单），前端生成的 P1 客户端（bangumi/frontend `packages/client`）中亦无对应端点。待上游开放后实现，不要臆测端点。好友添加/移除（`PUT/DELETE /p1/friends/{username}`）已按官方端点实现。
- [ ] 删除自己的动态：`DELETE /p1/timeline/{id}` 端点虽在 P1 spec 中，但官方 iOS 客户端（Bangumi-iOS）与官网均未实现删除 UI，实测返回 5xx。已移除 Kaku 的删除入口，API 路由与测试保留待上游恢复。
