# API Worker 部署指南

`apps/api` 是部署在 Cloudflare Workers 上的 Hono 服务（worker 名
`kaku-api`，地址 `https://kaku-api.shqingda.workers.dev`），绑定 D1
（`kaku-production`）、KV（`KAKU_CONFIG`）和两个 Cron 触发器：

- `0 3 * * *`：清理过期认证数据
- `*/15 * * * *`：给已登记设备轮询 Bangumi 通知，分别走 FCM / APNs；Android FCM 后端已上线，APNs 凭据暂缓

本文只写本机手动部署。CI（`.github/workflows/ci.yml`）跑类型检查、测试和
覆盖率，**不**自动 `wrangler deploy`。

最近一次部署为 2026-11-08，Worker 版本 `1f822255-3b60-47ee-8113-d932166e780e`，撤下 11-07 临时上线的屏蔽失败诊断日志（版本 `98f42089`），行为与 11-07 的 `24b13d2e` 一致；屏蔽名单写入接口因 Bangumi P1 返回 500（bangumi/server-private#1787）只为旧客户端保留。远端无待应用迁移，API 测试 400 项通过，部署后健康检查与 `/config` 返回 200、未登录 `/me/timeline` 与 `/me/blocklist` 返回 401。部署自分支 `chore/remove-dead-entries`（PR #1，尚未合入 main）。0011 迁移已于 10-29 上线；真实登录、设备归并和推送仍待设备验收。新部署仍先列远端迁移。

## 前提

1. Cloudflare 账号登录，二选一：
   - 交互登录：`npx wrangler login`（OAuth token 存在
     `~/Library/Preferences/.wrangler/config/default.toml`）；
   - 或环境变量 `CLOUDFLARE_API_TOKEN`（CI 场景）。
   检查登录状态：`npx wrangler whoami`。
2. 解除代理环境变量，否则上传会挂起（与 git push 相同）：

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

Secrets 不进 git。`wrangler secret put <NAME>` 会立即部署一个新版本；仅准备配置、暂不切换线上时，使用 `wrangler versions secret put <NAME>`，后者只生成未部署版本。确认启用时再部署并复核凭据。当前代码使用：

| 名称 | 用途 |
| --- | --- |
| `BANGUMI_CLIENT_ID` | Bangumi OAuth 应用 ID |
| `BANGUMI_CLIENT_SECRET` | Bangumi OAuth 应用密钥 |
| `TOKEN_ENCRYPTION_KEY` | AES-GCM 加密 Bangumi token（32 字节 base64） |
| `FCM_SERVICE_ACCOUNT_JSON` | Android FCM HTTP v1 服务账号 JSON |
| `APNS_PRIVATE_KEY` | iOS APNs `.p8` PEM 私钥 |
| `APNS_KEY_ID` / `APNS_TEAM_ID` | Apple 推送签名的 Key ID / Team ID |

本地开发用 `apps/api/.dev.vars`（从 `.dev.vars.example` 复制，不要提交）。
本机不发真实推送时可不配 FCM / APNs Secrets；登记会明确返回配置缺失。原生推送凭据、D1 迁移和启用顺序见 [原生推送指南](native-push.md)。不再依赖 `EXPO_ACCESS_TOKEN`。

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

2026-11-03 起线上版本使用新 FCM 私钥（`449c424c…`）。回滚到更早的版本会带回旧私钥；旧密钥已于 2026-11-03 在 Google Cloud 删除，这些版本的推送会认证失败，回滚后需用 `wrangler versions secret put FCM_SERVICE_ACCOUNT_JSON` 从 `.secrets/fcm/service-account.json` 重新写入。

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


## 目录写入保护与恢复

目录并发保护与迁移 `0008_perpetual_gressill.sql` 已上线，见 [目录保存保护记录](../test-records/2026-10-16-index-save-conflict.md)。新环境仍须先迁移再部署；迁移只新增 `index_write_locks` 表，回滚时不删表。旧版 API 不遵守占用，混用旧／新 Worker 的部署切换期间不能保证互斥；回滚旧版 API 会撤销这项保护。新 API 也保护旧客户端的重叠写入，但旧客户端没有 `expected`，顺序保存仍可能覆盖新内容。

表以 `(user_id, index_id)` 为主键，`operation_id` 标识持有者，`created_at` 便于定位。正常完成／明确拒绝后释放；上游写入超时、5xx、202 或 Worker 中断后，结果无法确认，记录会保留，后续写入返回 423。此时不能仅因等待时间较长就解锁：上游请求可能仍会执行，超时／中止本地 fetch 不能证明上游已停止。

恢复时先停止对该账号／目录的重试，核查对应请求已经结束、上游写入已完成或确定不再执行，并读回目录最终状态。确认前保持占用并让用户保留草稿；无法确认时不自动清除。只在核查确认并获得恢复授权后，按**账号、目录和原始操作编号**删除单条记录，防止误删其他操作。不清空整表，不加入定时清理。

以下是数据库内的查询模板，需由维护者替换参数并在正确环境执行；它不是可直接执行的自动恢复脚本：

```sql
SELECT user_id, index_id, operation_id, created_at
FROM index_write_locks WHERE user_id = :user_id AND index_id = :index_id;

-- 完成上述核查并确认恢复后，使用刚核查的 operation_id，检查仅影响一行。
DELETE FROM index_write_locks
WHERE user_id = :user_id AND index_id = :index_id AND operation_id = :operation_id;
```

不对占用记录设置自动过期，也不在删除账号或认证清理时级联删除，避免尚未确认的上游写入失去保护。

## 已上线安全机制与兼容边界

`0009_architecture_safety.sql` 对应的安全修复已上线，原始验证见 [架构修复](../test-records/2026-10-16-architecture-review-fixes.md)。后续部署仍须保留下述迁移与原生客户端的兼容顺序，真实新登录、发送和设备验收按 [TODO](../../TODO.md) 跟踪。

发布前先准备并验证含 `expo-crypto` 的原生构建，协调客户端可用时间；API 上线后旧客户端发起新登录会被拒绝，不能把准备安装包留到 API 部署后。

1. 先按标准流程应用 D1 迁移，再部署对应 API；新增表和字段保留既有账号、会话、偏好、历史与草稿，不通过删除旧数据准备发布。
2. 协调发布已准备的 `expo-crypto` 新原生客户端，保留现有签名与包名。旧开发客户端通过 JS 更新不能获得新的原生模块；仅用 OTA 不能完成新登录能力升级。
3. API 与客户端均就绪后验证真实新登录、正常会话刷新、目录/收藏保存和推送。不要为验收而退出或清空现有测试设备，应使用另行授权的测试账号流程。

新 API 要求 verifier / S256 challenge / requestId；旧客户端的新登录会明确要求升级，已建立会话与 refresh 协议继续有效。升级前发起、没有 proof 的短期 OAuth transaction / handoff 不能兑换，用户需要重新发起登录。章节批量写入缺少基线的旧请求返回 428，不再静默覆盖；普通收藏字段写入不需要此基线。

旧 `push_devices` 行没有 session 归属时保留原数据，但不参与投递。客户端下一次正常登记会绑定当前 session；无需强制退出或清理 token。迁移中新增 session 外键必须带 `ON DELETE cascade`；Drizzle 的 ALTER TABLE 输出已人工复核补齐，真实 D1 测试验证级联效果。

刷新占用保存在 `bangumi_credentials.refresh_operation_id`。`refresh_lease_expires_at` 是判断结果等待期限的时间，**不是自动解锁租约**。上游超时、5xx、200 返回错误账号或落库失败时，不能因为过了 60 秒就重放旧 refresh token；轮换可能已经在 Bangumi 生效。客户端收到 `bangumi_refresh_unconfirmed` 时保留会话与本机数据，由用户重新授权建立新 connection generation；不要手工清掉占用后重试旧 refresh token。

`collection_write_locks` 与目录占用遵循相同恢复原则：未知上游操作不自动过期。维护者确认上游已结束、读回最终状态并获准恢复后，只按 user_id、subject_id、operation_id 删除对应一行。不要清空整表或把它加入每日维护；与认证会话分离，避免注销使未知写入失去保护。

推送已使用 FCM / APNs，服务商接受结果与游标按登记身份保护提交。旧 Expo receipt 仅按原 24 小时保留期清理，不再写入或查询服务商回执；原生失效 token 的处理与重试边界见 [原生推送指南](native-push.md)。服务商接受不证明设备已显示，数据库提交失败仍可能导致后续重复发送。

开发、CI 与发布构建显式设置 `EXPO_PUBLIC_KAKU_API_URL`。本地原生构建脚本和 GitHub Actions 保留生产 origin，不再使用 EAS；本地隔离测试需显式选择 loopback API，示例见 [移动端环境模板](../../apps/mobile/.env.example)。不要把本机测试库当作现有生产账号的数据源。正式构建拒绝 HTTP API 地址。

`0011_yielding_betty_brant.sql` 为 sessions 增加可空 `device_key`，已随上述 2026-10-29 部署上线。新登录只归并同账号、同标识的会话；旧会话不回填归属，不能按设备名称猜测。回滚 Worker 保留新增列，兼容旧 API；实际同机重装效果仍待设备验证。


Bangumi v0 的条目收藏 POST 在同步完成后返回空 202（[固定实现](https://github.com/bangumi/server/blob/5fc276a1f22368a80655c2b72427f24d177dee83/web/handler/user/post_subject_collection.go#L44-L57)），由专属 adapter 识别完成；这不改变通用占用规则。其他端点、重定向或带 body 的 202 仍视为未确认，不可据此批量解锁。未知收藏写入日志为 `collection_write_unconfirmed`，只含操作编号与安全状态，按对应 D1 key 定位，不记录或索取用户 token。
