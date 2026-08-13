# Kaku 待办

## 暂时隐藏

- [ ] 恢复“角色与人物收藏”入口（含自己的主页与好友主页）。目前通过 `SHOW_ENTITY_ENTRY` 开关全部隐藏，相关页面、查询和接口均保留；待 Bangumi P1 的角色/人物取消收藏接口不再返回 500，并完成 iOS 与 Android 真机验证后恢复。

## 等待上游

- [ ] 加入/退出小组：Bangumi P1 公开接口没有小组成员写操作（官网靠服务端表单），前端生成的 P1 客户端（bangumi/frontend `packages/client`）中亦无对应端点。待上游开放后实现，不要臆测端点。好友添加/移除（`PUT/DELETE /p1/friends/{username}`）已按官方端点实现。
