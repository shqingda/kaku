# Kaku

一个使用 Expo、React Native 和 TypeScript 开发的跨平台条目进度客户端。

后端是独立的 Hono + Cloudflare Worker 应用，用于保存不能暴露在
客户端的 OAuth 密钥、管理设备会话，并代理需要登录的 Bangumi 写入。

当前 MVP 以 Bangumi 公开数据为数据源，支持：

- 在看条目与章节进度
- 条目搜索、每日放送和排行榜
- 搜索结果、完整动画排行榜和公开内容列表分页加载
- 条目资料、角色、制作人员和关联条目
- 角色详情、声优与制作人员详情、相关作品
- 章节格子与列表视图
- 吐槽箱、评论、讨论版和单集讨论
- 用户公开主页、收藏、日志、好友与时间线
- 条目相关目录、目录详情
- 公开小组、小组话题与回复
- Bangumi OAuth 真实登录
- 收藏状态、章节进度与评分同步
- 多设备会话查看、单设备退出与全部断开

公开资料无需登录；收藏、进度和评分需要连接 Bangumi，并直接以
Bangumi 账户中的数据为准，不再维护一份独立的本地收藏。

## 环境

- Node.js 26.5 或更高版本
- pnpm 11
- Xcode 与 iOS Simulator（运行 iOS 开发客户端时需要）

## 启动

```bash
pnpm install
pnpm dev:mobile
```

本地启动 API：

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm --filter @kaku/api db:migrate:local
pnpm dev:api
```

`apps/api/.dev.vars` 仅用于本地开发且不会提交。Bangumi OAuth 需要填写
应用 ID、应用密钥和回调地址；`TOKEN_ENCRYPTION_KEY` 可使用
`openssl rand -base64 32` 生成。

远程 D1 迁移与 Worker 部署：

```bash
pnpm --filter @kaku/api db:migrate:remote
pnpm --filter @kaku/api deploy:worker
```

Metro 启动后按 `i` 打开 iOS 模拟器。也可以直接构建原生开发客户端：

```bash
pnpm --filter @kaku/mobile ios
```

## 检查

```bash
pnpm typecheck
pnpm test
```

测试使用 Node.js 内置的 `node:test`，覆盖关键纯逻辑，不额外引入测试框架。

## 目录

```text
apps/api/
├── drizzle/         D1 数据库迁移
└── src/
    ├── auth/        OAuth、令牌加密、刷新与多设备会话
    ├── collections/ 登录后的收藏读取与写入
    └── db/          Drizzle 数据表定义
apps/mobile/src/
├── app/             Expo Router 页面与导航
├── constants/       设计常量
├── features/        业务模型、查询与功能组件
├── infrastructure/  Bangumi API、Schema 与 Adapter
├── types/           跨模块共享类型
└── lib/             通用工具
apps/web/             产品官网、定价、政策与支持页面
```

业务模型尽量保持数据源无关。Bangumi 相关字段解析和转换应留在
`infrastructure/bangumi`，不要直接扩散到页面组件。

## 当前限制

- Bangumi 官方 API 尚未开放删除条目收藏，Kaku 会明确提示而不会伪造成功
- 讨论与回复当前以公开阅读为主，登录写入能力仍需按官方接口逐项接入
- iOS 与 Android 处于开发测试阶段，尚未发布正式商店版本
- macOS 客户端尚未开始实现
