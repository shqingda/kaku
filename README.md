# Kaku

Kaku 是面向 iOS 与 Android 的第三方 Bangumi 客户端，使用 Expo、React
Native 与 TypeScript 构建。

## 项目状态

| 应用 | 说明 | 状态 |
| --- | --- | --- |
| `apps/mobile` | Expo / React Native 移动客户端 | iOS、Android 开发测试中；GitHub 最新包 `v1.1.5` |
| `apps/api` | OAuth、会话、登录后写入代理、偏好/推送/公开缓存 | Cloudflare Workers 运行中 |
| `apps/web` | 产品介绍、隐私政策、服务条款与 FAQ | Cloudflare Workers 运行中 |

还没上架 App Store / Play。Android 日常包走本地构建 + GitHub Releases
（debug 签名，覆盖安装须先卸载）。发版见 `RELEASE.md`。

## 主要功能

公开数据无需登录。收藏、进度、评分和其他个人数据以 Bangumi 账户为准，
Kaku 不维护一份与远端相冲突的本地收藏。

### 浏览与发现

- 条目搜索、每日放送、排行榜与分类频道
- 动画、书籍、音乐、游戏和三次元条目
- 条目资料、排名、评分、标签、关联条目、制作人员
- 角色、人物及其相关作品；全站人物/角色浏览
- 标签索引与维基修订动态
- 公开用户主页、收藏、日志、好友和时间线
- 目录发现；新建、编辑、删除目录；收藏与取消收藏目录
- 最近搜索与最近浏览（可随账户同步）

### 收藏与进度

- 对应 Bangumi 的想看、看过、在看、搁置与抛弃状态
- 动画与三次元章节进度同步
- 章节格子、列表视图、长篇作品分段，以及上一集/下一集切换
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

上游没有稳定写接口的能力故意不做：加入/退出小组、删除自己的动态、
角色与人物收藏。移动端不做 i18n；官网有中英切换。

## 技术架构

### Mobile

- Expo SDK 57、React Native 0.86、React 19
- Expo Router 文件路由
- TanStack Query 管理服务端状态，公开查询持久化到本机
- Zod 校验外部数据
- Expo SecureStore 保存 Kaku 会话
- 手势与动画走 Reanimated；worklet 约定见 `AGENTS.md`

### API

- Hono on Cloudflare Workers
- Cloudflare D1 与 Drizzle ORM；KV 存公开配置
- Bangumi OAuth 2.0；AES-GCM 加密保存 Bangumi 授权凭据
- 短期 access session 与轮换 refresh session
- Cron：每天清理过期认证数据，每 15 分钟给已登记设备轮询通知
- 部署与回滚见 `docs/deploy-api.md`

### Web

- React、TypeScript 与 Vite
- Cloudflare Workers Static Assets
- 中英文案切换（仅官网）

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

`apps/api/.dev.vars` 只用于本地开发，不应提交。Bangumi OAuth 需要配置应用
ID、应用密钥和回调地址；`TOKEN_ENCRYPTION_KEY` 可使用以下命令生成：

```bash
openssl rand -base64 32
```

生产环境另外需要 `EXPO_ACCESS_TOKEN`（推送代发），见 `docs/deploy-api.md`。

### 启动官网

```bash
pnpm dev:web
```

## 验证

```bash
pnpm typecheck                             # 全 workspace 类型检查
pnpm test                                  # 各 workspace 纯逻辑单元测试
pnpm --filter @kaku/mobile test:coverage   # 移动端行覆盖门禁（92%）
pnpm --filter @kaku/api test:coverage      # API 行覆盖门禁（75%）
pnpm --filter @kaku/mobile test:ui         # 组件与 hook 测试（jest-expo + RNTL）
pnpm test:smoke                            # Maestro iOS 冒烟（需模拟器，本地跑）
pnpm test:smoke:all                        # Maestro iOS 全量入口
pnpm build:web
```

测试分三层：纯逻辑、组件与 hook、Maestro。CI 跑前两层、覆盖率门禁、
JS bundle 和官网构建；Maestro 不进 CI。清单见 `docs/testing.md`。

文档索引：`docs/README.md`。未完成事项：`TODO.md`。协作约定：`AGENTS.md`。

## 目录结构

```text
apps/
├── api/
│   ├── drizzle/             D1 数据库迁移
│   └── src/
│       ├── auth/            OAuth、凭据加密与多设备会话
│       ├── db/              Drizzle 数据表定义
│       ├── push/            设备登记与通知轮询
│       ├── preferences/     外观等偏好云同步
│       └── …                浏览、收藏、社区、目录、维基等适配
├── mobile/
│   └── src/
│       ├── app/             Expo Router 页面与导航
│       ├── constants/       设计常量
│       ├── features/        业务模型、查询与 UI 组件
│       ├── infrastructure/  Bangumi 与 Kaku API Adapter
│       ├── lib/             通用工具
│       └── types/           跨模块共享类型
└── web/                     产品官网、政策与支持页面
docs/                        测试、部署、Argent 与运营备忘
.maestro/                    模拟器冒烟与全量入口
```

## 部署

应用部署前应先完成本地检查，并通过 Wrangler 的官方 OAuth 登录。不要在命令、
源码或提交记录中写入密钥。代理环境下先
`unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY`。

```bash
pnpm --filter @kaku/api db:migrate:remote
pnpm --filter @kaku/api deploy:worker
pnpm --filter @kaku/web deploy
```

API 细节见 `docs/deploy-api.md`。Android 安装包见 `RELEASE.md`。
