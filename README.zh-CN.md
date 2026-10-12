[English](README.md) · 简体中文

# Kaku

Kaku 是面向 iOS 与 Android 的第三方 Bangumi 客户端，使用 Expo、React Native 与 TypeScript 构建。

文档从 [文档导航](docs/README.md) 进入：架构、开发测试、部署发布、面试材料和历史记录。

## 项目状态

| 应用 | 说明 | 状态 |
| --- | --- | --- |
| `apps/mobile` | Expo / React Native 移动客户端 | iOS、Android 开发测试中；安装包在 [GitHub Releases](https://github.com/shqingda/kaku/releases/latest) |
| `apps/api` | OAuth、会话、登录后写入代理、偏好 / 推送 / 公开缓存 | Cloudflare Workers 运行中 |
| `apps/web` | 产品介绍、隐私政策、服务条款与 FAQ | Cloudflare Workers 运行中 |

还没上架 App Store / Play。Android 日常包走本地构建 + GitHub Releases（本地 debug 签名；同包名、同签名可覆盖安装，与旧 EAS 签名不同则不能直接覆盖）。见 [发版指南](docs/deployment/release.md)。

## 主要功能

公开数据无需登录。收藏、进度、评分和其他个人数据以 Bangumi 账户为准，Kaku 不维护一份与远端冲突的本地收藏。

### 浏览与发现

- 条目搜索、每日放送、排行榜与分类频道
- 动画、书籍、音乐、游戏和三次元条目
- 条目资料、排名、评分、标签、关联条目、制作人员
- 角色、人物及其相关作品；全站人物 / 角色浏览
- 标签索引与维基修订动态
- 公开用户主页、收藏、日志、好友和时间线
- 目录发现；新建、编辑、删除目录；收藏与取消收藏目录
- 最近搜索与最近浏览（可随账户同步）

### 收藏与进度

- 对应 Bangumi 的想看、看过、在看、搁置与抛弃状态
- 动画与三次元章节进度同步
- 章节格子、列表视图、长篇作品分段，以及上一集 / 下一集切换
- 个人评分与 Bangumi 账户同步
- 最近打开的条目会做成离线包，无网时仍可看资料

### 评论与社区

- 吐槽箱与长评
- 条目讨论版、单集讨论、小组话题
- 新建条目与小组话题；编辑与删除自己的回复
- 好友动态阅读与发布；发表的日志可点进详情
- 添加与移除好友；屏蔽与取消屏蔽用户
- 举报用户、话题与回复
- Bangumi 通知列表（全部 / 未读）与可选系统推送

### 账户与系统

- Bangumi OAuth 登录；多设备会话查看、单设备退出与全部断开
- 浅色 / 深色 / 跟随系统，偏好云同步
- 网络诊断：本机探测 Bangumi 域名，status.bgm.tv 只当旁证
- 本机错误记录（可分享，不含凭证）与应用内更新日志
- 主屏幕快捷方式；条目、日志、话题、人物、用户、目录可分享
- 离线、重试与不可用状态的明确反馈，不会变成空白 loading

当前未开放加入 / 退出小组、删除自己的动态、角色与人物收藏入口。上游接口与真实写入的复核见 [TODO](TODO.md)。移动端不做 i18n；官网有中英切换。

## 技术架构

- 手机端：Expo / React Native，Expo Router，TanStack Query
- 后端：Hono / Cloudflare Workers，D1 保存自有用户数据，代理 Bangumi 授权和个人操作
- 官网：React / Vite，Cloudflare Workers Static Assets

细节见 [技术架构](docs/architecture.md)。

## 安全边界

- Bangumi 密码始终由 Bangumi 官方页面处理，Kaku 不接收或保存密码
- Bangumi `client_secret` 与 OAuth token 只保存在服务端
- App 登录回调只携带短时、一次性的 handoff code，不携带 Bangumi access token
- Bangumi token 使用 AES-GCM 加密后写入 D1；Kaku refresh token 仅保存哈希
- 用户可以撤销单台设备会话，或断开 Bangumi 并删除全部 Kaku 会话与凭据

## 开发

**前置要求。** Node.js 26.5+、pnpm 11；iOS 需要 Xcode 与模拟器；Android 需要 Android SDK，或开启 USB 调试的真机。

```sh
pnpm install
```

**移动端。**

```sh
pnpm dev:mobile
```

首次安装或原生依赖变化后，重新构建开发客户端：

```sh
pnpm --filter @kaku/mobile ios
pnpm --filter @kaku/mobile android
```

iOS 开发客户端已装好时：先开模拟器，跑 `pnpm dev:mobile`，再执行 `pnpm --filter @kaku/mobile open:ios`，通过本机 8081 连 Metro。改过 Expo 插件配置后，先 `pnpm --filter @kaku/mobile exec expo prebuild --clean --platform ios` 重生 iOS 工程，再构建客户端并重启 Metro。

**API。**

```sh
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm --filter @kaku/api db:migrate:local
pnpm dev:api
```

`apps/api/.dev.vars` 只用于本地，不要提交。Bangumi OAuth 需要应用 ID、密钥和回调地址。`TOKEN_ENCRYPTION_KEY` 可用 `openssl rand -base64 32` 生成。生产环境还需要 `EXPO_ACCESS_TOKEN`（推送），见 [API 部署指南](docs/deployment/deploy-api.md)。

**官网。**

```sh
pnpm dev:web
```

## 验证

```sh
pnpm typecheck
pnpm test
pnpm --filter @kaku/mobile test:coverage
pnpm --filter @kaku/api test:coverage
pnpm --filter @kaku/mobile test:ui
pnpm test:smoke
pnpm test:smoke:all
pnpm test:tooling
pnpm build:web
```

测试分三层：纯逻辑、组件与 hook、Maestro。CI 跑前两层、覆盖率、JS bundle 和官网构建；Maestro 不进 CI。见 [测试指南](docs/development/testing.md)。

## 文档

- [文档导航](docs/README.md)
- [技术架构](docs/architecture.md)
- [测试指南](docs/development/testing.md)
- [发版指南](docs/deployment/release.md)
- [API 部署](docs/deployment/deploy-api.md)
- [项目经历与面试](docs/learning/kaku-project-experience.md)
- [TODO](TODO.md)
- [AGENTS](AGENTS.md)

## 部署

先完成本地检查，再用 Wrangler OAuth 登录。不要把密钥写进命令、源码或提交。代理环境下先：`unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY`。

```sh
pnpm --filter @kaku/api db:migrate:remote
pnpm --filter @kaku/api deploy:worker
pnpm --filter @kaku/web deploy
```

[API 部署指南](docs/deployment/deploy-api.md) · [发版指南](docs/deployment/release.md)
