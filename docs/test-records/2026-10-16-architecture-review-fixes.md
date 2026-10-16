# 架构 Review 修复验证（2026-10-16）

依据 [Review 对话](chatgpt-conversation://6ad1bee1-7bd4-83ec-bba3-93287d29aa9f) 逐项核对当前代码；原 Review 基于 b7b50a9，本轮从 f6b39db 的干净工作区开始。目录保存冲突已由前一轮修复，本轮没有重复实现该链路。执行顺序见 [计划](../plans/2026-10-16-architecture-review-fixes.md)。

## 行为复现与结果

| 问题 | 回归覆盖与修复 |
| --- | --- |
| 登录交接无客户端绑定 | 缺失/错误 verifier、错误 requestId、降级 plain、没有本机 pending 均拒绝；错误 proof 不消费合法 handoff；并发合法兑换仅一次成功，重复 App 回调只兑换一次 |
| 会话撤销不停止推送 | 真正 Miniflare D1 迁移、级联删除、其他设备/账号保留；认证后撤销不能重新登记；通知读取期间撤销后不安排发送；旧注销不删新会话登记 |
| 刷新复活凭据与并发退出 | 暂停刷新后断开或重连，旧结果不能重建/覆盖；并发只有一个上游 exchange，等待者等到落库；忙碌 503；不确定兑换过期仍不重放，200 错账号也保留占用 |
| 排队写入串号 | 真实 AuthProvider + QueryClient 队列，A→B 和同账号新 session 后旧任务拒绝；body 和回调迟到不报告成功/回填缓存；旧 signOut/disconnect 不清 B；私有乐观缓存按身份隔离 |
| 章节完整快照覆盖与小数混淆 | 按 episode ID 增量保留其他章节；0.5、1 与 1.5 不混写；批量缺基线 428、冲突 412 且零上游写入；D1 重叠写 423；部分成功/结果不明不盲目重试 |
| 公共请求 signal 使超时失效 | 外部 signal 与 12 秒截止时间同时生效；预取消/进行中取消传播，计时器和监听器结束后释放 |
| 限流并发丢计数 | 两个独立 API 实例共享真实 D1，100 并发仅预算内 40 通过；窗口恢复、独立桶、伪造 XFF 无效；D1 缺失/失败 503，零 Cache 回退 |
| 推送缺 receipt / 慢请求串行阻塞 | 成功 ticket 持久化与游标同事务；故障注入使两者一起回滚；晚到 receipt 不删除新登记；15 分钟/24 小时边界、缺失回执轮转、100/1000 分批及 D1 100 参数上限；4 路用户并发及 12 秒超时；后续批失败不丢首批无效登记清理，清理失败不丢已接受 ticket |

额外覆盖同一边界的收尾问题：后台刷新期间只改评论不写回旧状态/评分/隐私/进度；13 个含小数章节、总集数仍为 12 时不截断未改的快照；5000 章节变化线性处理；旧持久化缓存缺 episode ID 时不崩溃或猜测批量基线。失败登录保留原私有缓存、云同步和成功旋转的会话凭证；旧 refresh 不可在新登录后回写内存或 SecureStore。

新增逻辑测试、组件测试与 D1 集成测试先在旧行为上失败，再实现修复。交叉审查对照实际源码复现了私有乐观缓存残留、迟到 response body、失败登录冻结同步、旧断开撤销新连接和交接消费后重新签发会话的窗口，并按同一身份/连接版本边界收口。

测试有效性另外用隔离源码副本验证：反转推送登记版本比较，发送前复核测试失败；移除会话签发的 generation 守卫，消费后断开/重连两例失败；将原子限流 `<=` 改为 `<`，100 并发用例因 39 而不是 40 通过而失败。变异均已恢复，未跳过测试、去掉断言或降低阈值。

## 验证环境与门禁

Node 26.12.0，锁文件由 pnpm 11.28.5 维护，与 CI 的 pnpm 11 一致。新增依赖仅 Expo SDK 57 推荐的 `expo-crypto ~57.0.4`；共享契约复用已有 zod 4.6.7，不引入新的 schema 库。

空元数据缓存下 `CI=1 pnpm dlx pnpm@11 install --frozen-lockfile --cache-dir /tmp/kaku-architecture-review/cold-cache` 通过 1110 条供给链策略验证。此次没有新增发布等待期例外，前一轮六个精确版本的已授权例外保持原样。

最终整合检查：

| 检查 | 结果 |
| --- | --- |
| `pnpm typecheck` | shared、API、mobile、web 全通过 |
| API 覆盖率测试 | 396 条通过，行覆盖率 93.99%（原门槛 75%） |
| mobile 覆盖率测试 | 385 条通过，行覆盖率 94.74%（原门槛 92%） |
| mobile 组件测试 | 63 suites、347 条通过；类型收尾后认证定向 25 条再次通过 |
| shared 契约测试 | 6 条通过 |
| 工具链测试 | 19 条 Node + 2 条 Python 通过 |
| Expo compatibility / Doctor | 依赖兼容；21/21 诊断通过，原有两项版本检查排除保持不变 |
| iOS / Android 导出、网站构建 | 全通过 |
| API Worker dry-run | 通过，只生成本机 bundle，没有部署 |
| 完整 diff / 交叉审查 | 通过，无新增跳过测试、抑制或降低门槛 |

小数章节边界另有 RED/GREEN：`resizeWatchedEpisodes([0.5, 1], 2, 12)` 原错误返回 `[1, 2]`，修复后保留 `[0.5, 1]`，已纳入全量逻辑覆盖。日志和打包产物保存在 `/tmp/kaku-architecture-review/`，不提交缓存、生成包或测试账号凭据。

代码按四组提交到本地 `main`：认证与身份 `a50a302`、收藏增量 `a998719`、推送生命周期 `41942d9`、原子限流 `c252afe`。远端仍为本轮开始的 `f6b39db`。

## 迁移与发布边界

新增迁移 `0009_architecture_safety.sql` 仅新增表/字段，不清空现有用户、会话或草稿。真实 D1 测试从此前迁移建立旧行后升级，验证旧推送游标保留、session/registration 为空且暂停发送。会话外键的级联动作已复核；Drizzle 生成 ALTER SQL 时遗漏的 cascade 已补齐。

本轮没有应用远端 D1 迁移、部署 API、推送 Git、发布 APK/商店包或向真实设备发送通知，也没有为测试退出账号、卸载或清理模拟器数据。新原生 Crypto 模块需重建客户端后再做真实登录验收；旧客户端启动恢复现有会话不加载新模块，缺模块发起新登录时显示明确升级提示。

上线按 [部署指南](../deployment/deploy-api.md) 先准备原生构建，再迁移、部署 API 并协调客户端发布。旧客户端新登录和缺基线的章节覆盖会被安全拒绝，已有会话刷新保留。上游网页写入无法纳入 Kaku 的 D1 原子保护；已交给 Expo/APNs/FCM 的消息不能撤回；receipt 错误本轮可观察，不自动重放已接受的通知。

同一轮 registry 审计与升级前基线相同：3 low、20 moderate、38 high、1 critical，`expo-crypto` 无直接命中。既有 critical 为开发工具链 `shell-quote`（修复版 >=1.11.0），另有打包/开发链依赖的 high 公告；本轮不做无关强制依赖升级。本次 Worker dry-run 的 source map 共 238 个来源，未包含 shell-quote 及记录中的其他 high 工具链模块路径；这不替代正式发布依赖审计，下一次依赖审计复查日期为 2026-10-23；本记录不把安装成功当作依赖安全证明。

## 官方依据

- [RFC 7636：S256 与 verifier 绑定](https://www.rfc-editor.org/rfc/rfc7636)
- [RFC 9700：Refresh Token 轮换与重放风险](https://www.rfc-editor.org/rfc/rfc9700#section-4.14.2)
- [Cloudflare D1 batch 事务](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch)、[外键](https://developers.cloudflare.com/d1/sql-api/foreign-keys/)、[参数与资源上限](https://developers.cloudflare.com/d1/platform/limits/)
- [Expo Push ticket / receipt 与错误处理](https://docs.expo.dev/push-notifications/sending-notifications/)
- [Expo Crypto](https://docs.expo.dev/versions/v57.0.0/sdk/crypto/)、[开发构建与原生依赖](https://docs.expo.dev/develop/development-builds/introduction/)
- [TanStack Mutation scope 与串行队列](https://tanstack.com/query/latest/docs/framework/react/guides/mutations#mutation-scopes)
