# Kaku

Kaku 是面向 iOS 与 Android 的第三方 Bangumi 客户端，使用 Expo、React
Native 与 TypeScript 构建。

## 项目状态

Kaku 目前包含移动端、服务端 API 与产品官网三个应用：

| 应用 | 说明 | 状态 |
| --- | --- | --- |
| `apps/mobile` | Expo / React Native 移动客户端 | iOS、Android 开发测试中 |
| `apps/api` | OAuth、会话与登录后写入代理 | Cloudflare Workers 运行中 |
| `apps/web` | 产品介绍、政策与支持页面 | Cloudflare Workers 运行中 |

macOS 客户端尚未开始实现。若后续进入桌面端开发，将优先采用 Electron。

## 主要功能

### 浏览与发现

- 条目搜索、每日放送与排行榜
- 动画、书籍、音乐、游戏和三次元条目
- 条目资料、排名、评分、标签与关联条目
- 角色、声优、制作人员及其相关作品
- 公开用户主页、收藏、日志、好友和时间线
- 目录、小组、话题与公开回复

### 收藏与进度

- 对应 Bangumi 的想看、看过、在看、搁置与抛弃状态
- 动画与三次元章节进度同步
- 章节格子、列表视图与长篇作品分段
- 个人评分与 Bangumi 账户同步
- 多设备会话查看、单设备退出与全部断开

### 评论与社区

- 吐槽箱与长评
- 条目讨论版与单集讨论
- 新建条目与小组话题
- 好友动态阅读与发布
- 添加与移除好友
- 网络失败、重试与不可用状态的明确反馈

公开数据无需登录。收藏、进度、评分和其他个人数据以 Bangumi 账户为准，Kaku
不维护一份与远端相冲突的本地收藏。

## 技术架构

### Mobile

- Expo SDK 57、React Native 0.86、React 19
- Expo Router 文件路由
- TanStack Query 管理服务端状态与缓存
- Zod 校验外部数据
- Expo SecureStore 保存 Kaku 会话

### API

- Hono on Cloudflare Workers
- Cloudflare D1 与 Drizzle ORM
- Bangumi OAuth 2.0
- AES-GCM 加密保存 Bangumi 授权凭据
- 短期 access session 与轮换 refresh session

### Web

- React、TypeScript 与 Vite
- Cloudflare Workers Static Assets

业务模型尽量保持数据源无关。Bangumi API 的请求、Schema 与 Adapter 位于
`infrastructure/bangumi`；页面和业务组件不直接依赖原始响应结构。

## 安全边界

- Bangumi 密码始终由 Bangumi 官方页面处理，Kaku 不接收或保存密码。
- Bangumi `client_secret` 与 OAuth token 只保存在服务端。
- App 登录回调只携带短时、一次性的 handoff code，不携带 Bangumi access token。
- Bangumi token 使用 AES-GCM 加密后写入 D1；Kaku refresh token 仅保存哈希。
- 用户可以撤销单台设备会话，或断开 Bangumi 并删除全部 Kaku 会话与凭据。

## 开发环境

### 前置要求

- Node.js 26.5 或更高版本
- pnpm 11
- iOS：Xcode 与 iOS Simulator
- Android：Android SDK，或启用 USB 调试的 Android 设备

### 安装依赖

```bash
pnpm install
```

### 启动移动端

```bash
pnpm dev:mobile
```

Metro 启动后可按 `i` 打开 iOS 模拟器。首次安装或原生依赖变化后，需要重新构建开发客户端：

```bash
pnpm --filter @kaku/mobile ios
pnpm --filter @kaku/mobile android
```

### 启动 API

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm --filter @kaku/api db:migrate:local
pnpm dev:api
```

`apps/api/.dev.vars` 只用于本地开发，不应提交。Bangumi OAuth 需要配置应用 ID、应用密钥和回调地址；`TOKEN_ENCRYPTION_KEY` 可使用以下命令生成：

```bash
openssl rand -base64 32
```

### 启动官网

```bash
pnpm dev:web
```

## 验证

```bash
pnpm typecheck
pnpm test
pnpm build:web
```

测试优先覆盖授权、会话轮换、数据 Adapter、分页、重试、收藏状态与进度等关键纯逻辑。

## 目录结构

```text
apps/
├── api/
│   ├── drizzle/             D1 数据库迁移
│   └── src/
│       ├── auth/            OAuth、凭据加密与多设备会话
│       ├── collections/     登录后的收藏读取与写入
│       ├── db/              Drizzle 数据表定义
│       └── timeline/        好友动态读取与发布适配
├── mobile/
│   └── src/
│       ├── app/             Expo Router 页面与导航
│       ├── constants/       设计常量
│       ├── features/        业务模型、查询与 UI 组件
│       ├── infrastructure/  Bangumi 与 Kaku API Adapter
│       ├── lib/             通用工具
│       └── types/           跨模块共享类型
└── web/                     产品官网、政策与支持页面
```

## 部署

应用部署前应先完成本地检查，并通过 Wrangler 的官方 OAuth 登录。不要在命令、源码或提交记录中写入密钥。

```bash
pnpm --filter @kaku/api db:migrate:remote
pnpm --filter @kaku/api deploy:worker
pnpm --filter @kaku/web deploy
```
