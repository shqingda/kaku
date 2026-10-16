# 架构 Review 修复验证（2026-10-16）

> 最新状态：五个准备提交及设备验收发现的 `abaa60c` 补丁均已推送；0009 与 API 已上线，指定模拟器已更新原生开发客户端并通过会话恢复、等值保存和受控 412。发布详情见末节。

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

代码按四组提交到本地 `main`：认证与身份 `a50a302`、收藏增量 `a998719`、推送生命周期 `41942d9`、原子限流 `c252afe`。代码准备结束时尚未推送，远端当时为 `f6b39db`；后续上线记录见末节。

## 迁移与发布边界

新增迁移 `0009_architecture_safety.sql` 仅新增表/字段，不清空现有用户、会话或草稿。真实 D1 测试从此前迁移建立旧行后升级，验证旧推送游标保留、session/registration 为空且暂停发送。会话外键的级联动作已复核；Drizzle 生成 ALTER SQL 时遗漏的 cascade 已补齐。

代码准备阶段没有应用远端 D1 迁移、部署 API、推送 Git、发布 APK/商店包或向真实设备发送通知，也没有为测试退出账号、卸载或清理模拟器数据。新原生 Crypto 模块需重建客户端后再做真实登录验收；旧客户端启动恢复现有会话不加载新模块，缺模块发起新登录时显示明确升级提示。

上线按 [部署指南](../deployment/deploy-api.md) 先准备原生构建，再迁移、部署 API 并协调客户端发布。旧客户端新登录和缺基线的章节覆盖会被安全拒绝，已有会话刷新保留。上游网页写入无法纳入 Kaku 的 D1 原子保护；已交给 Expo/APNs/FCM 的消息不能撤回；receipt 错误本轮可观察，不自动重放已接受的通知。

同一轮 registry 审计与升级前基线相同：3 low、20 moderate、38 high、1 critical，`expo-crypto` 无直接命中。既有 critical 为开发工具链 `shell-quote`（修复版 >=1.11.0），另有打包/开发链依赖的 high 公告；本轮不做无关强制依赖升级。本次 Worker dry-run 的 source map 共 238 个来源，未包含 shell-quote 及记录中的其他 high 工具链模块路径；这不替代正式发布依赖审计，下一次依赖审计复查日期为 2026-10-23；本记录不把安装成功当作依赖安全证明。

## 官方依据

- [RFC 7636：S256 与 verifier 绑定](https://www.rfc-editor.org/rfc/rfc7636)
- [RFC 9700：Refresh Token 轮换与重放风险](https://www.rfc-editor.org/rfc/rfc9700#section-4.14.2)
- [Cloudflare D1 batch 事务](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch)、[外键](https://developers.cloudflare.com/d1/sql-api/foreign-keys/)、[参数与资源上限](https://developers.cloudflare.com/d1/platform/limits/)
- [Expo Push ticket / receipt 与错误处理](https://docs.expo.dev/push-notifications/sending-notifications/)
- [Expo Crypto](https://docs.expo.dev/versions/v57.0.0/sdk/crypto/)、[开发构建与原生依赖](https://docs.expo.dev/develop/development-builds/introduction/)
- [TanStack Mutation scope 与串行队列](https://tanstack.com/query/latest/docs/framework/react/guides/mutations#mutation-scopes)


## 上线与指定 iOS 模拟器验收

用户授权：推送五个提交，先准备原生构建，再迁移、部署和验证；保留现有账号、草稿与数据。

### 发布与构建

- 原五个提交已推送到 `origin/main`，代码 SHA `7377ab6608a8187538e3fe230bfeb6f770e6cc55`；[CI 38871318945](https://github.com/shqingda/kaku/actions/runs/38871318945) 全部通过。
- 先生成 iOS 原生工程，依赖版本与锁文件未变；121 个 Pods 安装成功，包含 `ExpoCrypto 57.0.4`，原生模块注册表含 CryptoModule。Xcode 27 Debug 模拟器构建通过，包名仍为 `com.shqingda.kaku.debug`、版本 1.1.18。
- 第一份禁用签名的构建出现通知钥匙串权限错误；随后按正常模拟器 ad-hoc 签名重新构建并覆盖升级，现有会话可读取。没有卸载、退出、抹掉设备、清理钥匙串或应用数据。iOS 更新迁移了数据容器路径，不能用容器 UUID 相同作为数据保留证明。
- D1 迁移前取得 Time Travel 书签；仅应用 `0009_architecture_safety.sql`，14 条命令成功，再次查询无待应用迁移。迁移前后均为 users 2、sessions 2、preferences 1、recent_subjects 2、search_history 2、push_devices 5；旧推送登记保留。远端 push_devices 的 session 外键已确认 ON DELETE CASCADE。
- 初次 API 版本为 `9477b89e-8d9f-4da0-85cd-52fd80a8a7ae`。设备验收发现下述 202 兼容问题后，追加最小修复 `abaa60c074ebc504d8605700c01ba9cb796f98a2`，[CI 38874554483](https://github.com/shqingda/kaku/actions/runs/38874554483) 全部通过后再部署。
- 最终 API 版本为 `fea0c1e5-053d-4ac4-9c80-22eadfcd925a`。D1、KV、两个 Cron 和 secrets 保持原配置；没有回滚数据库。`/health` 正常、`/config` 200、无会话收藏请求 401、缺 proof 的新登录 400。

### 设备验收发现并修复的 202 协议差异

对已有收藏做等值 comment 保存时，API 误报 423；不含修改字段的请求可以 200。自动化原先只覆盖 204，与真实上游不一致。

核对 Bangumi [固定版本的 POST handler](https://github.com/bangumi/server/blob/5fc276a1f22368a80655c2b72427f24d177dee83/web/handler/user/post_subject_collection.go#L29-L57) 及其同步更新调用：该端点在更新完成后返回空 202；PATCH 条目与章节端点则返回 204。OpenAPI 的 POST 响应仍写 204，不能只依赖该 schema 推断运行行为。

新增真实 D1 路由用例先复现 `423 !== 200`，再在 Bangumi adapter 中只把**精确 origin、POST 条目路径、未重定向且空 body 的 202** 转为内部完成响应。其他端点／方法、带异步结果 body 的 202、网络失败及 5xx 仍保留占用；并发保护和原门槛未降低。另加固定事件诊断日志，只包含方法、操作 UUID 与状态码或固定原因，不记录 URL、正文、凭据及原始异常。最终 API 401 项、行覆盖率 94.00%，类型检查通过。

初次两次等值验收留下的误占用，按记录的账号、条目、提交时间和各自 operation_id 精确核对；两条收藏均重新读取成功，结合已确认的同步 202 协议后仅收回这两条占用。数据库报告删除 2 行，后续同 key 占用为 0；没有按时间自动解锁、清空表或解锁其他未知真实操作。

### 实际通过的路径与保留证据

只使用既有 iPhone 18 Pro / iOS 27.0 `498E27B7-5192-48CE-9B13-F4A27F10F806`。运行 `pnpm dev:sim` 并在 Codex 内置浏览器实际点击；旧 Metro 缺 API 环境变量，确认它属于本项目后重启为当前脚本配置，没有改变模拟器其他服务。

1. 新原生客户端冷启动恢复现有账号；再次冷启动正常首页，不要求重新登录。
2. 真正调用原生 Crypto 生成随机数、S256 摘要与 UUID，通过格式检查；没有新建或保存 pending login，也没有发起 OAuth。
3. 临时验收页通过现有 AuthProvider 和真实 API 读取已有动画收藏。修复后对条目 3135 做等值 comment 保存，真实 PUT 200；再次 GET，schema 内全部收藏字段与保存前完全一致。
4. 使用正式 CollectionControls 打开并保存表单，API 成功后 sheet 关闭；没有改收藏状态、评分、进度、标签或隐私。
5. 同一正式编辑器输入测试文本 `2026`；验收驱动只提交与当前进度相同的 watchedEpisodeNumbers 和刻意过期的 ID 基线，不发送这段测试 comment。线上返回真实 412，界面呈现“其他设备已更新章节进度，请刷新确认后重新修改”，关闭提示后输入仍为 `2026`。这是受控过期基线验收，不是真实双设备竞态。
6. 移除临时路由、逐字恢复首页并冷启动；原有 1 条草稿和 2 条历史记录的存在性及 SHA-256 与升级前一致。指定条目的验证占用最终为 0，PosterBoard 仍 disabled。

临时入口复用正式 mutation／编辑器与真实服务，没有伪造响应、跳过鉴权或导出 token；所有临时代码已移除，未提交到仓库。截图与本机日志在 `/tmp/kaku-architecture-rollout/`，没有把账号数据、生成工程或构建产物提交到 Git。

本轮只更新模拟器的原生开发客户端，没有发布商店包／正式 APK。真实新登录、真机推送与双设备并发仍待独立验收；现有依赖审计债务和已交付推送不可撤回等边界继续保留。
