# Kaku

一个使用 Expo、React Native 和 TypeScript 开发的跨平台条目进度客户端。

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

目前不需要登录。观看进度保存在设备本地，重新启动应用后仍会保留。

## 环境

- Node.js 26.5 或更高版本
- pnpm 11
- Xcode 与 iOS Simulator（运行 iOS 开发客户端时需要）

## 启动

```bash
pnpm install
pnpm dev:mobile
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
apps/mobile/src/
├── app/             Expo Router 页面与导航
├── constants/       设计常量
├── features/        业务模型、查询与功能组件
├── infrastructure/  Bangumi API、Schema 与 Adapter
├── types/           跨模块共享类型
└── lib/             通用工具
```

业务模型尽量保持数据源无关。Bangumi 相关字段解析和转换应留在
`infrastructure/bangumi`，不要直接扩散到页面组件。

## 当前限制

- 尚未实现登录和真实写入
- 观看进度暂未与 Bangumi 账号同步
- Android 和 Web 尚未完成正式适配
- 后端仍处于规划阶段
