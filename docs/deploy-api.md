# API Worker 部署指南

`apps/api` 是部署在 Cloudflare Workers 上的 Hono 服务（worker 名
`kaku-api`，地址 `https://kaku-api.shqingda.workers.dev`），绑定 D1
（`kaku-production`）、KV（`KAKU_CONFIG`）和两个 Cron 触发器：

- `0 3 * * *`：清理过期认证数据
- `*/15 * * * *`：给已登记设备轮询 Bangumi 通知并走 Expo Push

本文只写本机手动部署。CI（`.github/workflows/ci.yml`）跑类型检查、测试和
覆盖率，**不**自动 `wrangler deploy`。

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

   `unset` 必须和后面的部署命令在**同一个终端会话**里；新开终端要重新做。

## 标准部署流程

以下命令都在仓库根目录执行（`pnpm --filter` 会在 `apps/api` 下运行，
wrangler 能正确读取该目录的 `wrangler.jsonc`）：

```sh
# 1. 测试与类型检查必须全绿
pnpm --filter @kaku/api typecheck
pnpm --filter @kaku/api test

# 2. 检查并应用未落地的 D1 迁移
pnpm --filter @kaku/api exec wrangler d1 migrations list kaku-production --remote
pnpm --filter @kaku/api db:migrate:remote

# 3. 部署（构建 + 上传 + 更新 Cron；不改动 secrets）
pnpm --filter @kaku/api deploy:worker
```

`wrangler deploy` 读取 `apps/api/wrangler.jsonc`。KV / D1 绑定、Cron、
`vars`（目前只有 `BANGUMI_REDIRECT_URI`）随配置更新。Secrets 不受影响。

改过 `wrangler.jsonc` 的绑定或兼容性标志后，补跑：

```sh
pnpm --filter @kaku/api types:worker
```

把生成的 `src/worker-configuration.d.ts` 一并提交。

## Secrets

用 `wrangler secret put <NAME>` 写生产，不会进 git。当前代码要求：

| 名称 | 用途 |
| --- | --- |
| `BANGUMI_CLIENT_ID` | Bangumi OAuth 应用 ID |
| `BANGUMI_CLIENT_SECRET` | Bangumi OAuth 应用密钥 |
| `TOKEN_ENCRYPTION_KEY` | AES-GCM 加密 Bangumi token（32 字节 base64） |
| `EXPO_ACCESS_TOKEN` | Expo Push 代发；缺了 Cron 轮询不会发推送 |

本地开发用 `apps/api/.dev.vars`（从 `.dev.vars.example` 复制，不要提交）。
`.dev.vars.example` 里没有 `EXPO_ACCESS_TOKEN`：本机不发真实推送也可以跑。

生产回调地址在 `wrangler.jsonc` 的 `vars.BANGUMI_REDIRECT_URI`，不是 secret。

## 部署后验证

```sh
# 健康检查
curl -s https://kaku-api.shqingda.workers.dev/health

# 公开配置，应返回 200 与 JSON
curl -s https://kaku-api.shqingda.workers.dev/config

# 未带会话访问鉴权路由，应返回 401
curl -s -o /dev/null -w "%{http_code}\n" \
  https://kaku-api.shqingda.workers.dev/me/timeline
```

需要真机验证的功能（好友动态、通知推送）在 App 内确认。

## 回滚

在 `apps/api` 目录执行，否则 wrangler 找不到这个 worker：

```sh
pnpm --filter @kaku/api exec wrangler deployments list
pnpm --filter @kaku/api exec wrangler rollback
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
  `wrangler.jsonc` 的 `triggers.crons`，并核对 `apps/api/src/index.ts`
  里对 `0 3 * * *` 的分支判断。
