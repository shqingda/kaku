# API Worker 部署指南

`apps/api` 是部署在 Cloudflare Workers 上的 Hono 服务（worker 名
`kaku-api`，地址 `https://kaku-api.shqingda.workers.dev`），绑定 D1
（`kaku-production`）、KV（`KAKU_CONFIG`）和两个 Cron 触发器（每天 03:00
清理过期认证数据、每 15 分钟推送轮询）。本文描述通用的手动部署流程；
CI/CD 自动化当前不存在，所有部署都是本机执行 `wrangler deploy`。

## 前提

1. Cloudflare 账号登录，二选一：
   - 交互登录：`npx wrangler login`（OAuth token 存在
     `~/Library/Preferences/.wrangler/config/default.toml`）；
   - 或环境变量 `CLOUDFLARE_API_TOKEN`（CI 场景）。
   检查登录状态：`npx wrangler whoami`。
2. 解除代理环境变量，否则上传会挂起（与 git push / EAS 相同的坑）：

   ```sh
   unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY
   ```

## 标准部署流程

在仓库根目录执行：

以下命令都在仓库根目录执行（`pnpm --filter` 会在 `apps/api` 下运行，
wrangler 能正确读取该目录的 `wrangler.jsonc`）：

```sh
# 1. 测试与类型检查必须全绿
pnpm --filter @kaku/api typecheck
pnpm --filter @kaku/api test

# 2. 检查 D1 迁移是否全部应用（有未应用的先 apply）
pnpm --filter @kaku/api exec wrangler d1 migrations list kaku-production --remote
pnpm --filter @kaku/api exec wrangler d1 migrations apply kaku-production --remote

# 3. 部署（构建 + 上传 + 更新 Cron 触发器；不改动 secrets）
pnpm --filter @kaku/api deploy:worker
```

注意：第 0 步的 `unset` 代理必须与后面的部署命令在**同一个终端会话**
里执行，新开终端要重新 unset。

`wrangler deploy` 读取 `apps/api/wrangler.jsonc`；KV/D1 绑定、Cron、
`vars` 随配置更新，Secrets（`wrangler secret put` 设置的项）不受影响。

## 部署后验证

```sh
# 公开配置端点，应返回 200 与 JSON
curl -s https://kaku-api.shqingda.workers.dev/config

# 未带会话访问鉴权路由，应返回 401
curl -s -o /dev/null -w "%{http_code}\n" \
  https://kaku-api.shqingda.workers.dev/me/timeline
```

需要真机验证的功能（如好友动态日志跳转、通知推送）在 App 内确认。

## 回滚

```sh
npx wrangler deployments list          # 查看历史版本
npx wrangler rollback                  # 交互选择上一个版本回滚
```

## 本地开发

```sh
pnpm --filter @kaku/api db:migrate:local   # 本地 D1 迁移
pnpm --filter @kaku/api dev                # wrangler dev 热重载
```

## 注意事项

- 部署是全量替换当前工作区代码：确认 `git status` 干净、待发布提交已
  合入后再执行，避免把临时改动带上生产。
- D1 迁移只增不删；新的迁移文件由 `pnpm --filter @kaku/api db:generate`
  从 `drizzle.config.ts` 生成。
- 免费 Cron 额度足够当前两个触发器；改动 Cron 计划要同步更新
  `wrangler.jsonc` 的 `triggers.crons`。
