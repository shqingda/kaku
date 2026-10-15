[English](README.md) · 简体中文

# Kaku

Kaku 是面向 iOS / Android 的第三方 Bangumi 客户端（Expo / React Native / TypeScript）。公开数据不用登录；收藏、进度、评分跟 Bangumi 账户走。

[最新版本](https://github.com/shqingda/kaku/releases/latest) · [文档](docs/README.md) · [待办](TODO.md)

## 项目状态

| 应用 | 说明 | 状态 |
| --- | --- | --- |
| `apps/mobile` | Expo 客户端 | iOS / Android 测试中；安装包在 [Releases](https://github.com/shqingda/kaku/releases/latest) |
| `apps/api` | OAuth、会话、写入代理、偏好 / 推送 / 缓存 | Cloudflare Workers |
| `apps/web` | 产品站、隐私、条款、FAQ | Cloudflare Workers |

还没上架 App Store / Play。Android 日常包走本地构建 + GitHub Releases。见 [发版指南](docs/deployment/release.md)。

## 功能

浏览条目、人物、目录、排行与时间线；同步 Bangumi 收藏状态与章节进度；吐槽、长评、讨论版、好友动态、通知（可选推送）。OAuth 多设备会话、主题云同步、最近条目离线包、可分享的本机错误记录。

未开放：加入 / 退出小组、删除自己的动态、角色 / 人物收藏入口。其余见 [TODO](TODO.md)。

## 安全

Bangumi 密码只在官方页处理。`client_secret` 与 OAuth token 留在服务端。App 只拿一次性 handoff code。D1 里的 token 用 AES-GCM；Kaku refresh token 只存哈希。可撤销单设备会话，或断开 Bangumi 并清空凭据。

## 开发

Node.js 26.5+、pnpm 11。iOS 要 Xcode；Android 要 SDK 或可调试真机。

```sh
pnpm install
pnpm dev:mobile
```

在 Codex 中运行本机 iOS 模拟器：`pnpm dev:sim`，再用内置浏览器打开预览。
也可以直接对 Codex 说“打开 Kaku 模拟器”。详见 [启动与输入恢复](docs/development/ios-simulator.md)。

首次安装或原生依赖变化后重建开发客户端：

```sh
pnpm --filter @kaku/mobile ios
pnpm --filter @kaku/mobile android
```

**API**

```sh
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm --filter @kaku/api db:migrate:local
pnpm dev:api
```

**官网：** `pnpm dev:web`

[技术架构](docs/architecture.md) · [测试](docs/development/testing.md) · [API 部署](docs/deployment/deploy-api.md)

## 文档

- [文档导航](docs/README.md)
- [技术架构](docs/architecture.md)
- [测试指南](docs/development/testing.md)
- [发版指南](docs/deployment/release.md)
- [API 部署](docs/deployment/deploy-api.md)
- [项目经历与面试](docs/learning/kaku-project-experience.md)
