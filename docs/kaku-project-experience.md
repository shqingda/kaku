# Kaku 项目经历与实现详解

## 可直接用于简历的项目经历

**Kaku（第三方 Bangumi 客户端）｜个人项目 · 独立全栈开发**\
技术栈：React Native、Expo、TypeScript、TanStack Query、Reanimated、Hono、Drizzle ORM、Cloudflare Workers / D1

- 独立完成移动端、后端 API 与产品官网开发，面向 iOS、Android 实现作品搜索、收藏评分、章节进度同步及社区讨论；完成服务端部署，通过 GitHub Releases 分发 Android 安装包。
- 基于 Hono 实现 OAuth 登录与多设备会话管理，使用短期访问凭证、刷新凭证轮换及授权凭据加密存储，支持单设备退出与全部会话撤销。
- 使用 TanStack Query 管理服务端状态，结合查询持久化与条目离线包支持缓存恢复和离线浏览；通过 Zod 校验与 Adapter 转换隔离上游数据结构，统一处理失败、重试和不可用状态。
- 使用 Reanimated 实现手势交互与动画，在单集讨论页引入 FlashList 支持长评论列表与远距离定位；建立单元、组件及 Maestro 分层测试，并通过 GitHub Actions 执行类型检查、覆盖率门禁和构建验证。

---

## 阅读说明与项目边界

本文用于理解和准备面试，不建议把后面的全部内容放进简历。实现核对日期：2026-09-13。代码片段标为“源码节选”的保留原实现；标为“简化示意”的省略了上下文，不能直接作为完整文件运行。

这是个人独立开发项目，不属于比亚迪在职项目。未提供开发起止时间，因此不编造日期；也不填用户量、商业收益、性能提升百分比。独立开发描述的是个人对产品、实现与交付的责任，不代表不使用开源库或辅助开发工具；面试问到具体开发方式时按实际情况说明。

按仓库项目说明，服务端和官网已部署，Android 安装包通过 GitHub Releases 分发，iOS、Android 仍在开发测试中，尚未上架 App Store / Google Play。这些是项目记录，不是本文重新对生产环境进行探测的结果。

来源：[README.md](/Users/shqingda/Projects/kaku/README.md)、[RELEASE.md](/Users/shqingda/Projects/kaku/RELEASE.md)、[TODO.md](/Users/shqingda/Projects/kaku/TODO.md)。

## 技术栈：每一项在项目里负责什么

| 技术 | 项目中的职责 | 面试时应讲清的区别 |
| --- | --- | --- |
| React Native | 移动端页面、列表、输入和交互组件 | 使用原生组件体系，不是把官网装进 WebView |
| Expo | 开发客户端、原生能力集成、原生工程生成与构建流程 | 引入原生依赖后可能需要重新构建开发客户端 |
| TypeScript | 业务模型、组件参数、接口调用的静态类型 | 无法单独验证网络实际返回的数据 |
| Expo Router | 基于文件组织页面、动态参数和导航 | 属于移动端路由；简历技术栈可按篇幅省略 |
| TanStack Query | 查询、缓存、分页、刷新和 mutation 生命周期 | 管服务端状态；弹层开关等本地 UI 状态仍可用 React state |
| Reanimated / Gesture Handler | 动画数值、手势事件、弹簧与衰减运动 | 手势与动画可在 UI runtime 执行，不必每帧更新 React state |
| Hono | API 路由、请求上下文、鉴权与响应 | 是服务端框架，运行环境是 Cloudflare Workers |
| Zod | 外部响应、请求参数的运行时校验 | 与 TypeScript 配合，避免把类型断言当作校验 |
| Drizzle ORM | 声明数据库表、构造查询和条件更新 | ORM；不是数据库本身 |
| Cloudflare Workers / D1 | 执行 API / 提供托管关系数据存储 | D1 使用 SQLite 体系，不能描述成 PostgreSQL |
| React / Vite | 产品官网、政策和支持页面 | 与移动端分开构建和交付 |

## 第一条：独立完成客户端、API、官网和交付

### 1.1 “独立全栈开发”具体覆盖什么

项目分成三个应用：移动端负责用户交互，API 承担授权、登录后代理和应用自身数据，官网承载产品介绍、隐私政策、服务条款与 FAQ。不是只有界面 Demo，也不是自己重新实现一个 Bangumi 数据平台。

```text
移动端页面 → feature 查询与业务模型 → 数据源适配层
                                   ├─ Bangumi 公开接口
                                   └─ Kaku API → 鉴权 → Bangumi 授权接口
                                              └─ D1：会话、凭据、偏好等
产品官网 → 独立的静态资源构建与部署
```

公开浏览不强制登录。需要授权的操作由 Kaku 服务端持有上游凭据完成。作品资料和个人收藏的业务事实主要来自 Bangumi，D1 不维护另一套可能与远端冲突的个人收藏主库。

“全栈”的重点是能把一条用户操作讲通：页面如何输入、参数如何校验、身份如何确认、远端如何写入、缓存如何更新、失败如何反馈。

来源：[README.md](/Users/shqingda/Projects/kaku/README.md)、[apps/api/src/db/schema.ts](/Users/shqingda/Projects/kaku/apps/api/src/db/schema.ts)。

### 1.2 作品搜索与条目浏览

条目覆盖动画、书籍、音乐、游戏和三次元；发现入口包括搜索、每日放送、排行榜和分类频道。进入详情后展示资料、评分、标签、章节及关联信息。

请求不是直接把 JSON 交给页面：API client 先校验，provider 转成 `CatalogSubject`，查询 hook 再负责缓存和重试。比如作品中文名为空时回退到原名，章节按编号排序，评分排名无效时转成未提供。这些规则放在适配层，页面只展示业务字段。

来源：[apps/mobile/src/infrastructure/bangumi/api-v0/client.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/infrastructure/bangumi/api-v0/client.ts)、[apps/mobile/src/infrastructure/bangumi/catalog/provider.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/infrastructure/bangumi/catalog/provider.ts)、[apps/mobile/src/features/catalog/model.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/features/catalog/model.ts)。

### 1.3 收藏评分：怎样做到点下去立即反馈

收藏状态对应想看、看过、在看、搁置与抛弃，个人评分与 Bangumi 同步。修改收藏时先更新当前页面的 Query 缓存，让用户立即看到结果，再等待远端响应。

`useSavePersonalCollection` 的源码节选：

```ts
onMutate: async (update) => {
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData<PersonalCollection | null>(
    queryKey,
  );
  queryClient.setQueryData<PersonalCollection | null>(
    queryKey,
    mergePersonalCollection(previous, update, subjectId),
  );
  return { previous };
},
onError: (_error, _update, context) => {
  if (context) {
    queryClient.setQueryData(queryKey, context.previous);
  }
  void queryClient.invalidateQueries({ queryKey });
},
```

这里每一步都有作用：

1. 取消当前查询，减少旧响应覆盖新操作的机会。
2. 保存修改前快照，失败时有明确回滚依据。
3. 合并更新缓存，让界面先反馈；此时还不能宣称保存成功。
4. 失败时恢复快照并使查询失效，重新与远端对齐。
5. 成功时以服务端返回值覆盖缓存，并更新或使关联收藏列表失效。

同一收藏的 mutation 配置 `scope: { id: JSON.stringify(queryKey) }`，用相同 scope 串行执行写请求。这降低了同一条目的请求乱序风险，但不能夸大为已经证明所有快速连续操作、乐观快照和跨设备冲突都被完整解决。

来源：[apps/mobile/src/features/collections/use-personal-collection.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/features/collections/use-personal-collection.ts)。

### 1.4 章节进度同步

进度包含章节已看状态、章节列表与格子展示、长篇作品分段，以及上一集 / 下一集切换。这里的“同步”指通过登录后的接口更新远端进度，并让客户端状态与远端保持一致，不是设备间 WebSocket 实时推送，也不是离线写入队列。

单集页根据条目类型判断是否支持观看进度，读取个人收藏并调用保存逻辑。不同类型不能盲目套用动画的“已看”语义，例如音乐章节展示为“曲”。

面试可以用“标记本集已看”串起：路由定位条目与章节 → 读取个人进度 → 提交更新 → 缓存反馈 → 保存失败提示。

来源：[apps/mobile/src/app/subject/[id]/episode/[episodeNumber].tsx](/Users/shqingda/Projects/kaku/apps/mobile/src/app/subject/[id]/episode/[episodeNumber].tsx)、[apps/mobile/src/features/collections/model.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/features/collections/model.ts)、[apps/mobile/src/infrastructure/kaku/collections-client.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/infrastructure/kaku/collections-client.ts)。

### 1.5 社区讨论

社区能力包括吐槽箱、长评、条目讨论、单集讨论和小组话题；支持新建话题以及编辑、删除自己的回复。阅读和写入的身份要求不同，不能因为公开内容可读就省略写操作鉴权。

例如讨论查询通过 `useSessionAwareQuery` 选择公开请求或带会话的 Kaku 请求，同时生成与身份一致的缓存标记和 key 后缀。这样登录态查询与匿名查询不会只因 topicId 相同就共用同一个 key。

引用跳楼会查找回复 ID 对应的索引，再定位并短暂高亮，帮助用户确认自己跳到了哪一楼。

来源：[apps/mobile/src/features/discussions/use-bangumi-discussions.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/features/discussions/use-bangumi-discussions.ts)、[apps/mobile/src/features/auth/session-aware-query.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/features/auth/session-aware-query.ts)、[apps/mobile/src/features/discussions/use-reply-navigation.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/features/discussions/use-reply-navigation.ts)。

### 1.6 部署与安装包分发

服务端用 Workers 运行 Hono，D1 保存应用数据，Drizzle 管理表结构与迁移。官网由 React / Vite 构建，通过 Workers Static Assets 提供访问。

Android 日常分发流程是生成原生工程、Gradle 构建、整理更新说明并上传 GitHub Release。当前发版文档记录了 arm64-v8a 架构和 debug 签名的限制；不能把它说成已经完成商店正式签名与审核发布。

需要区分三个动作：部署 API、构建原生 APK、上传安装包。它们对应不同产物与验证步骤；推送 Git 提交也不等于三者都已完成。

来源：[docs/deploy-api.md](/Users/shqingda/Projects/kaku/docs/deploy-api.md)、[RELEASE.md](/Users/shqingda/Projects/kaku/RELEASE.md)、[scripts/build-split-apks.sh](/Users/shqingda/Projects/kaku/scripts/build-split-apks.sh)。

**这一条的口述示例：**

> Kaku 是我独立开发的第三方 Bangumi 客户端。我负责移动端、Hono API 和官网。除了搜索和浏览，核心链路是登录后同步收藏、评分和章节进度，以及参与讨论。收藏修改使用乐观更新和失败回滚，远端仍是最终依据。目前服务端已部署，Android 通过 GitHub Releases 分发，商店上架还没有完成。

## 第二条：OAuth、会话与凭据存储

### 2.1 为什么既有 Bangumi token，又有 Kaku session

Bangumi token 授权服务端访问用户的上游资源；Kaku session 证明当前请求属于哪位用户、哪台设备。两者分开，可以在不把上游凭据交给 App 的情况下管理设备会话。

这里的 Kaku token 是加密安全随机数生成的不透明凭证，服务端查库验证，不是 JWT。不能把“Bearer token”与“JWT”画等号。

### 2.2 OAuth 登录完整路径

```text
App 打开授权入口
  → Kaku 生成 state，保存其哈希和过期时间
  → 跳转 Bangumi 官方授权页
  → Bangumi 回调 Kaku，返回 code 与 state
  → Kaku 消费 state、用 code 换取上游 token、核对用户身份
  → 加密保存上游 token
  → 回跳 App，仅带一次性 handoff code
  → App 用 handoff code 换取 Kaku 会话
```

`state` 对应一次授权事务，用于验证回调与发起的流程匹配；回调消费该事务后不能重复使用。上游授权码与 App 交接码是两种不同的码。

回跳 App 的地址被限定为允许的地址，不能任意传入一个 URL 接收交接码。客户端密钥只在服务端使用，用户的 Bangumi 密码由官方页面处理。

源码节选：

```ts
const handoffCode = createRandomToken();
await store.createHandoff({
  codeHash: await hashToken(handoffCode),
  createdAt: updatedAt,
  expiresAt: updatedAt + HANDOFF_TTL_MS,
  userId: bangumiUser.id,
});

const appRedirect = new URL(transaction.appRedirectUri);
appRedirect.searchParams.set('code', handoffCode);
return context.redirect(appRedirect.toString());
```

交接码的意义是缩短深链中凭证的可用时间，并让它只能被消费一次；不能据此宣称消除了所有深链劫持风险。

来源：[apps/api/src/auth/routes.ts](/Users/shqingda/Projects/kaku/apps/api/src/auth/routes.ts)、[apps/api/src/auth/store.ts](/Users/shqingda/Projects/kaku/apps/api/src/auth/store.ts)。

### 2.3 短期访问凭证与刷新凭证

核对时的参数如下，不是所有项目都必须采用的通用配置：

| 对象 | 有效期 | 用途 |
| --- | --- | --- |
| OAuth 事务 state | 5 分钟 | 关联授权发起与回调 |
| App handoff code | 60 秒 | 一次性交换 Kaku 会话 |
| Kaku session token | 1 小时 | 日常 API 请求 |
| Kaku refresh token | 90 天 | 访问凭证过期后刷新会话 |

刷新时会同时更新 session token 和 refresh token，并重新计算有效期。因此目前是随成功刷新延长的刷新窗口，不能把 90 天描述为首次登录起绝对不变的总寿命。

API 读取 `Authorization: Bearer ...`，将 token 哈希后查找有效会话。移动端把 Kaku 会话保存到 SecureStore，不把授权 token 放进普通 Query 缓存。

来源：[apps/api/src/auth/session-service.ts](/Users/shqingda/Projects/kaku/apps/api/src/auth/session-service.ts)、[apps/mobile/src/features/auth/auth-storage.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/features/auth/auth-storage.ts)。

### 2.4 轮换如何避免旧刷新凭证被重复使用

刷新不是只校验一次后无条件覆盖：数据库更新条件同时包含 sessionId 和旧 refresh token 哈希。

`store.rotateSession` 源码节选：

```ts
.where(
  and(
    eq(sessions.sessionId, input.sessionId),
    eq(sessions.refreshTokenHash, input.previousRefreshTokenHash),
  ),
)
.returning({ sessionId: sessions.sessionId });
```

第一次更新成功后，旧哈希不再匹配。第二个拿着同样旧凭证的更新拿不到返回行，路由返回 `refresh_reused`。这是条件更新实现的并发保护，不能把它说成已经实现完整的“被盗检测及整个 token 家族撤销”。

客户端同时用 `refreshPromiseRef` 合并并发刷新：同一运行实例里的多个请求遇到过期会话时，复用正在执行的刷新 Promise。这解决客户端重复发起的问题，服务端条件更新则负责最终约束，两者不能互相替代。

来源：[apps/api/src/auth/store.ts](/Users/shqingda/Projects/kaku/apps/api/src/auth/store.ts)、[apps/api/src/auth/routes.ts](/Users/shqingda/Projects/kaku/apps/api/src/auth/routes.ts)、[apps/mobile/src/features/auth/auth-provider.tsx](/Users/shqingda/Projects/kaku/apps/mobile/src/features/auth/auth-provider.tsx)。

### 2.5 哪些凭据加密，哪些只存哈希

| 数据 | 存储方式 | 原因 |
| --- | --- | --- |
| Bangumi access / refresh token | 服务端 AES-GCM 加密后存 D1 | 服务端需要解密后调用上游 |
| Kaku session / refresh token | 服务端保存 SHA-256 哈希 | 验证时比较哈希即可，无需恢复原文 |
| OAuth state / handoff code | 服务端保存哈希 | 只需查找、验证和一次性消费 |
| App 的 Kaku 会话 | SecureStore | 客户端需读取凭证发送请求 |
| 普通查询缓存 | SQLite KV 存储 | 与凭据存储分开，当前没有额外加密 |

AES-GCM 源码节选：

```ts
const iv = crypto.getRandomValues(new Uint8Array(12));
const key = await importEncryptionKey(base64Key);
const encrypted = await crypto.subtle.encrypt(
  { iv, name: 'AES-GCM' },
  key,
  new TextEncoder().encode(value),
);
```

实现要求 32 字节密钥，每次生成随机 12 字节 IV，结果以版本号、IV、密文编码保存。GCM 同时提供加密与完整性校验。Base64URL 只是把二进制转为字符串，不是加密。

哈希随机 token 与哈希用户密码的场景不同：这里输入是高熵随机凭证，不能把这一方案直接照搬为用户密码存储方案。也不要宣称已有自动密钥轮换，代码中的密文版本号并不等于完整的轮换机制。

来源：[apps/api/src/auth/crypto.ts](/Users/shqingda/Projects/kaku/apps/api/src/auth/crypto.ts)、[apps/api/src/db/schema.ts](/Users/shqingda/Projects/kaku/apps/api/src/db/schema.ts)。

### 2.6 多设备会话和撤销范围

每个会话记录 sessionId、设备名、用户 ID、创建时间、最后使用时间及过期时间。设备名用于展示，不是硬件可信身份。

| 操作 | 当前路由 | 实际范围 |
| --- | --- | --- |
| 退出当前会话 | `DELETE /auth/session` | 当前凭证对应的会话 |
| 退出其他会话 | `DELETE /auth/sessions` | 保留当前会话，撤销其他会话 |
| 撤销指定会话 | `DELETE /auth/sessions/:sessionId` | 在当前用户范围内删除目标会话 |
| 断开连接 | `DELETE /auth/connection` | 删除用户全部 Kaku 会话和本地保存的 Bangumi 凭据 |

最后一项不等于已调用 Bangumi 官方撤销授权接口，也不能承诺撤回已经发往上游的请求。“全部会话撤销”的简历表述指 Kaku 自己管理的会话。

来源：[apps/api/src/auth/routes.ts](/Users/shqingda/Projects/kaku/apps/api/src/auth/routes.ts)、[apps/api/src/auth/store.ts](/Users/shqingda/Projects/kaku/apps/api/src/auth/store.ts)。

**这一条的口述示例：**

> 我把上游授权和客户端会话分开了。Bangumi token 加密留在服务端，App 回调只拿一个一分钟有效的一次性交接码，再换取 Kaku 会话。访问凭证一小时有效，刷新时轮换两种凭证；客户端合并并发刷新，数据库通过旧哈希条件更新防止重复使用。每台设备有独立会话，可以单独撤销。

## 第三条：服务端状态、离线与适配层

### 3.1 为什么使用 TanStack Query

作品、收藏、评论属于远端数据，需要解决请求状态、缓存复用、过期、刷新和写入后的关联更新。若每个页面分别用 state 和 effect 处理，容易重复实现，并漏掉请求取消和失败状态。

Query key 表达“这是哪份数据”，例如条目 ID、版本、用户 ID、分页参数。私有查询必须带用户身份，避免不同用户的同类查询占用同一缓存位置。`enabled` 控制缺少有效 ID 或会话时不发请求；`signal` 向底层传递取消意图。

`staleTime` 表示数据在多长时间内视为新鲜，不等于数据一过期就立刻删除，也不等于离线包保留时间。条目查询当前设为 5 分钟，个人收藏查询设为 1 分钟。

来源：[apps/mobile/src/lib/query-keys.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/lib/query-keys.ts)、[apps/mobile/src/features/catalog/use-catalog-subject.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/features/catalog/use-catalog-subject.ts)、[apps/mobile/src/features/collections/use-personal-collection.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/features/collections/use-personal-collection.ts)。

### 3.2 查询持久化与恢复

根节点的 `PersistQueryClientProvider` 负责缓存恢复与后续保存；persister 使用 `expo-sqlite/kv-store`，写入节流时间为 1 秒，避免每次缓存变化立即落盘。

筛选规则源码节选：

```ts
export function shouldPersistPublicQuery(query: PersistableQuery) {
  return (
    query.meta?.persist === true &&
    query.state.status === 'success' &&
    query.state.dataUpdatedAt > 0
  );
}
```

它只持久化明确允许、状态成功且有有效更新时间的查询。当前公开与私有查询都可能标记 `persist: true`；函数名仍含 Public，属于历史命名，不能据此误认为现在只缓存公开数据。

恢复配置的 `maxAge` 是 24 小时，`buster` 用于使不兼容的旧快照失效。需精确说明：这是持久化缓存恢复的最大年龄策略，不是逐条私有数据的加密销毁计时器。

冷启动先恢复可用缓存，让页面有数据可展示，再按查询配置取新数据。只能说“支持缓存恢复、减少重复等待”，没有实测前不要写“冷启动耗时降低 X%”或“所有页面秒开”。

来源：[apps/mobile/src/app/_layout.tsx](/Users/shqingda/Projects/kaku/apps/mobile/src/app/_layout.tsx)、[apps/mobile/src/lib/query-persistence.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/lib/query-persistence.ts)、[apps/mobile/src/lib/query-persister.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/lib/query-persister.ts)。

### 3.3 私有缓存的隔离与现有取舍

当前实现通过带用户身份的 query key 区分数据，用 `meta.private` 标记私有查询，并在认证状态相关的清理逻辑中调用 `removeQueries`。缓存移除后，persister 的后续写入更新持久化内容。

当前普通缓存没有额外加密。源码也明确记录了退出状态冷启动恢复时，私有缓存可能短暂恢复后才被清理的边界。因此不能把现有实现描述为“完全杜绝私有数据闪现”或“所有本地数据均安全加密”。这与 SecureStore 存会话、服务端加密 token 是不同层面。

如被追问后续改进，可以提出按账户拆分存储、先确定身份再恢复私有缓存、退出时显式清理磁盘。但必须标为改进方向，不能作为已完成成果。

来源：[apps/mobile/src/features/auth/auth-provider.tsx](/Users/shqingda/Projects/kaku/apps/mobile/src/features/auth/auth-provider.tsx)、[apps/mobile/src/lib/query-persistence.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/lib/query-persistence.ts)。

### 3.4 为什么还需要条目离线包

查询缓存主要用于恢复近期请求结果；离线包是专门保留最近打开的条目资料与章节。当前限制为最多 10 个条目、最长 30 天，使用独立存储 key。

| 维度 | Query 持久化 | 条目离线包 |
| --- | --- | --- |
| 保存对象 | 标记允许的成功查询 | `CatalogSubject` 条目与章节 |
| 主要目的 | 恢复查询缓存 | 网络请求失败时提供条目兜底 |
| 保留策略 | 恢复快照的 maxAge 24 小时 | 最多 10 个、30 天 |
| 是否提供写入同步 | 没有自动形成离线写队列 | 不支持离线写入同步 |
| 是否缓存全部资源 | 不是 | 不是，图片 URL 不等于图片文件已离线保存 |

条目查询的简化示意：

```ts
try {
  const subject = await getCatalogSubject(subjectId, signal);
  // 实际实现异步保存，并捕获落盘失败写入诊断日志。
  void saveOfflineSubject(subject).catch(recordSaveFailure);
  return subject;
} catch (error) {
  if (signal?.aborted) throw error;
  const packed = await loadOfflineSubject(subjectId);
  if (packed) return packed;
  throw error;
}
```

`recordSaveFailure` 是此处说明性的占位名称。真正源码使用 `recordDiagnosticError` 处理错误。落盘不阻塞展示，读取离线包后加上 `offlineSource: 'pack'`，页面显示离线来源提示和重试入口。

取消请求时直接抛出，避免把主动取消解释成网络故障，再不必要地恢复旧资料。没有离线包时继续抛错，不用空对象伪装成加载成功。

来源：[apps/mobile/src/features/catalog/use-catalog-subject.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/features/catalog/use-catalog-subject.ts)、[apps/mobile/src/features/catalog/offline-subject-pack.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/features/catalog/offline-subject-pack.ts)、[apps/mobile/src/features/catalog/offline-subject-pack-model.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/features/catalog/offline-subject-pack-model.ts)。

### 3.5 Zod 与 TypeScript 各解决什么

TypeScript 在开发与构建阶段检查类型，网络 JSON 在运行时仍可能缺字段或类型不对。Zod 在进入业务层前检查真实数据。

源码节选：

```ts
export async function getBangumiSubject(
  subjectId: number,
  signal?: AbortSignal,
) {
  const json = await requestJson(`/v0/subjects/${subjectId}`, { signal });
  return bangumiSubjectSchema.parse(json);
}
```

`parse` 失败会抛出校验错误，进入查询错误流程；`json as CatalogSubject` 只是静态断言，无法提供同样的保护。Zod 负责结构规则，不保证数据一定新鲜，也不自动完成不同数据源之间的语义统一。

来源：[apps/mobile/src/infrastructure/bangumi/api-v0/client.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/infrastructure/bangumi/api-v0/client.ts)、[apps/mobile/src/infrastructure/bangumi/api-v0/schemas.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/infrastructure/bangumi/api-v0/schemas.ts)。

### 3.6 Adapter 怎么隔离上游结构

以章节为例，Bangumi 用 `ep`、`name_cn`、`comment`，业务模型使用 `number`、`title`、`discussionCount`。转换集中在 provider，而非散落在页面里。

源码节选：

```ts
function toCatalogEpisode(episode: BangumiEpisodeResponse): CatalogEpisode {
  return {
    airDate: episode.airdate || undefined,
    description: episode.desc,
    discussionCount: episode.comment,
    duration: episode.duration || undefined,
    id: episode.id,
    number: episode.ep,
    originalTitle: episode.name,
    title: preferChineseName(episode.name_cn, episode.name),
  };
}
```

好处是字段命名、空值、中文名回退等规则只需在一处解释和修改；组件依赖业务模型，有利于测试和替换数据源。

边界也要讲清：目前主要接入 Bangumi，部分 hook 名称、ID 和类型语义仍带有来源特征。“尽量保持数据源无关”是已经采取的分层方向，不代表完成了多供应商插件系统，也不代表换一个 provider 就能零成本迁移。

来源：[apps/mobile/src/infrastructure/bangumi/catalog/provider.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/infrastructure/bangumi/catalog/provider.ts)、[apps/mobile/src/features/catalog/model.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/features/catalog/model.ts)。

### 3.7 失败、重试和不可用状态

需要区分首次加载、有效空结果、有缓存但刷新失败、离线包兜底，以及没有任何可用数据的失败。分页还有独立的加载更多失败，不能让一页失败覆盖整个列表。

`shouldRetryBangumiQuery` 对普通 4xx 不重试，408、429 以及其他可重试错误允许有限重试；判断上限是 `failureCount < 2`。`bangumiRetryDelay` 提供 `min(600 × 2^attemptIndex, 3000)` 毫秒退避，部分查询显式配置它，不能声称全部请求都统一使用了这个延迟。

分页自动加载有三重守卫：还有下一页、当前不在加载、上一次加载没有失败。失败后让用户按页脚重试，避免停在列表底部时不断自动请求失败接口。

离线包通过提示条说明来源，刷新失败保留已有内容，重试入口允许用户恢复。设计目标是“失败可理解、可操作”，不是“失败发生时仍显示无限 loading”。

来源：[apps/mobile/src/lib/query-retry.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/lib/query-retry.ts)、[apps/mobile/src/features/shared/use-paged-list.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/features/shared/use-paged-list.ts)、[apps/mobile/src/features/catalog/catalog-status-banner.tsx](/Users/shqingda/Projects/kaku/apps/mobile/src/features/catalog/catalog-status-banner.tsx)。

**这一条的口述示例：**

> 我用 Query 统一管理远端状态，并把成功且允许保存的查询写到本地，重启后先恢复缓存。另有最近十个条目的离线包，网络失败时回退并明确提示来源。外部 JSON 先过 Zod，再映射为页面使用的业务模型。缓存是体验层，收藏和进度仍以远端为准，没有做离线写入同步。

## 第四条：交互、长列表和验证

### 4.1 Reanimated 具体用在哪里

共享 `AppSheet` 使用 shared value 保存位移和遮罩透明度，Gesture Handler 提供拖动事件，动画样式读取这些数值。进入与回弹使用 `withSpring`，甩动关闭使用 `withDecay`，避免为了每帧位移触发一次 React 渲染。

手势更新在 UI runtime 中执行；需要调用 React 回调时通过 `runOnJS` 回到 JS。worklet 调用的辅助函数应为模块级并标记 `'worklet'`，不能假设任意组件内部函数都能直接从 UI runtime 调用。

来源：[apps/mobile/src/features/shared/app-sheet.tsx](/Users/shqingda/Projects/kaku/apps/mobile/src/features/shared/app-sheet.tsx)、[apps/mobile/src/lib/motion.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/lib/motion.ts)、[AGENTS.md](/Users/shqingda/Projects/kaku/AGENTS.md)。

### 4.2 弹簧、速度和中断分别是什么意思

弹簧根据当前位置向目标运动，`withDecay` 根据初始速度衰减；松手时同时考虑距离和速度，比固定“拖过一半就关”更贴近甩动操作。

当前弹层代码在开始手势时取消位移动画，并在拖动时更新 `translateY`；关闭分支给衰减动画传入 `Math.max(event.velocityY, 600)`，包含最低速度，不是所有情况下都严格继承原始速度。减少动态效果时关闭拖动手势，使用透明度过渡。

值得主动理解的实现边界：当前 `onUpdate` 主要直接使用 `event.translationY`，没有完整保存中断瞬间的位移基线；回弹分支也没有都显式传入释放速度。因此简历只能写“实现手势交互与动画”，不能升级为“所有动效都已实现无跳变中断和完整速度连续性”。如果要宣称后者，需要继续实现并验证。

### 4.3 FlashList 为什么适合在单集讨论页试点

单集评论会拿到完整回复数组，评论长度和引用造成不固定行高。数据已在内存中，不代表所有行已完成渲染与测量；这解释了为什么“数组有第 500 条”不等于按索引滚动一定能精确落地。

FlashList 使用视图复用，降低长列表滚动中的组件创建和布局压力。但它不负责减少上游返回的数据量，也不会自动缓存所有图片，更不会让任意长距离动画变慢。

目前只在单集讨论页接入，其他讨论列表仍使用 FlatList。试点的价值是先解决具体场景并验证，不能写成“全站完成 FlashList 改造”或“内存减少 X%”。

来源：[apps/mobile/src/app/subject/[id]/episode/[episodeNumber].tsx](/Users/shqingda/Projects/kaku/apps/mobile/src/app/subject/[id]/episode/[episodeNumber].tsx)、[apps/mobile/src/features/discussions/use-bangumi-discussions.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/features/discussions/use-bangumi-discussions.ts)、[IMPROVEMENT-PLAN.md](/Users/shqingda/Projects/kaku/IMPROVEMENT-PLAN.md)。

### 4.4 远距离定位为什么会像闪一下

当前列表按钮通过 `scrollToOffset({ animated: true, offset })` 发出原生滚动请求。`animated` 是开关，不是速度配置。跨越几百条评论时，过多距离可能压缩到短促动画内；可变行高的后续测量也可能导致位置修正。

现有改动采用分段策略：离底部不超过两屏时直接动画；超过两屏时先无动画定位到末尾前约两屏，再安排原生滚动到末尾。

源码节选：

```ts
list.scrollToOffset({ animated: false, offset: bottom - landingDistance });
landingFrameRef.current = requestAnimationFrame(() => {
  landingFrameRef.current = requestAnimationFrame(() => {
    landingFrameRef.current = null;
    replyNavigation.listRef.current?.scrollToOffset({
      animated: true,
      offset: maxScrollOffsetRef.current + 200,
    });
  });
});
```

双 `requestAnimationFrame` 给定位与目标附近布局留出提交机会，第二段重新读最新底部。它不是 FlashList 的“所有行已测量完成”通知，所以不能保证在所有负载下足够。

`+200` 是沿用的越界偏移余量，意图借助原生边界限制靠近末尾，不是动画时长，也不是任意行高下必然精确落底的证明。底部估值来自内容高度减视口高度，并在滚动、布局和内容尺寸变化时更新。

拖动、回顶、引用跳楼、换集与卸载会取消排队中的 frame。已经开始的原生滚动交给原生交互处理中断。减少动态效果时直接定位。

验证边界：这次分段修改完成了类型检查，没有设备动效验收。用户此前反馈 500 多条可到达底部，是定位体验反馈，不是修订后全机型流畅度或 FPS 测试。简历不写“全程丝滑”或“彻底消除闪烁”。

### 4.5 引用跳楼与“跳到底部”有何不同

引用跳楼知道目标 replyId，先找到索引，再 `scrollToIndex`，把目标放到视口约 20% 的位置，并设置约 1.6 秒高亮。跳到底部关注边界位置，使用 offset。

共享导航 hook 为 FlatList 保留索引失败后的粗定位和重试逻辑；不能把该回调说成 FlashList v2 的 API。当前共享 ref 使用 `any` 兼容两类列表，属于类型边界上的取舍，后续可用最小公共接口改善。

来源：[apps/mobile/src/features/discussions/use-reply-navigation.ts](/Users/shqingda/Projects/kaku/apps/mobile/src/features/discussions/use-reply-navigation.ts)。

### 4.6 分层测试各自验证什么

| 层次 | 工具和位置 | 适合验证 | 不替代什么 |
| --- | --- | --- | --- |
| 纯逻辑 | Node test；`*.test.mjs` | 数据转换、缓存规则、请求和认证逻辑 | 真实屏幕布局与原生手势 |
| 组件 / hook | Jest Expo、RNTL；`*.test.tsx` | 用户动作、渲染状态、hook 行为 | 真机帧率和系统权限行为 |
| 设备流程 | Maestro；`.maestro/` | 首页、搜索、详情、登录门控等实际导航 | 所有业务分支和所有机型 |
| 设备走查 | Argent 会话与测试记录 | 动效、截图、原生交互和运行时证据 | 自动化测试覆盖率 |

可阅读的具体用例：

- 离线包插入、去重和过期：[apps/mobile/tests/offline-subject-pack.test.mjs](/Users/shqingda/Projects/kaku/apps/mobile/tests/offline-subject-pack.test.mjs)。
- 收藏合并规则：[apps/mobile/tests/personal-collection.test.mjs](/Users/shqingda/Projects/kaku/apps/mobile/tests/personal-collection.test.mjs)。
- OAuth 与会话路由：[apps/api/tests/auth-routes.test.mjs](/Users/shqingda/Projects/kaku/apps/api/tests/auth-routes.test.mjs)。
- 凭据加解密：[apps/api/tests/crypto.test.mjs](/Users/shqingda/Projects/kaku/apps/api/tests/crypto.test.mjs)。
- 收藏列表组件：[apps/mobile/tests/my-collections-screen.test.tsx](/Users/shqingda/Projects/kaku/apps/mobile/tests/my-collections-screen.test.tsx)。

这表示仓库有这些测试，不表示本文重新运行并确认所有测试都通过。测试的存在也不能替代阅读断言，面试前应至少实际跑过并理解准备讲的用例。

### 4.7 覆盖率门禁与 GitHub Actions

当前 CI 在 PR 和 main 推送时执行依赖检查、Expo 诊断、全 workspace 类型检查、测试、覆盖率检查、移动端组件测试、iOS / Android JS bundle 和官网构建；另有 HTML 解析回归 job。

移动端纯逻辑行覆盖门槛为 92%，API 为 75%。它们来自各自 `test:coverage` 命令的采集范围，不能描述为“整个移动 App 92% 的功能都测过”，也不代表每个页面、原生交互和所有代码文件都被纳入。

CI 源码节选：

```yaml
- name: Type-check workspace
  run: pnpm typecheck

- name: Check API test coverage
  run: pnpm --filter @kaku/api test:coverage

- name: Check mobile test coverage
  run: pnpm --filter @kaku/mobile test:coverage

- name: Run mobile component tests
  run: pnpm --filter @kaku/mobile test:ui
```

`expo export --platform ios/android` 检查 JS 及资源打包，不会完成 Xcode / Gradle 原生编译，也不是安装到设备的验收。Maestro 当前在本地跑，不在该 CI 中；文档记录 iOS 全量入口已跑，Android 全量仍有待验收事项。

来源：[.github/workflows/ci.yml](/Users/shqingda/Projects/kaku/.github/workflows/ci.yml)、[docs/testing.md](/Users/shqingda/Projects/kaku/docs/testing.md)、[apps/mobile/package.json](/Users/shqingda/Projects/kaku/apps/mobile/package.json)、[apps/api/package.json](/Users/shqingda/Projects/kaku/apps/api/package.json)、[TODO.md](/Users/shqingda/Projects/kaku/TODO.md)。

**这一条的口述示例：**

> 交互上，我用 Reanimated 的 shared value 驱动弹层，结合手势、弹簧和衰减运动。长评论列表先在单集页试用 FlashList，并把远距离跳底拆成定位和最后两屏动画。验证分为纯逻辑、组件和设备流程，CI 跑类型、测试、覆盖率和 JS 打包。长距离动效的最终手感还需要设备验证，我没有给它编造性能提升数据。

## 面试前建议实际演示的三条路径

1. **收藏修改**：打开条目 → 修改收藏 / 评分 → 对照 mutation 的快照、成功更新和失败回滚 → 说明远端是最终依据。
2. **登录与撤销**：展示登录调用链和设备会话页 → 解释 handoff code、两类 token、条件轮换及撤销范围；不要展示真实凭证。
3. **弱网浏览与长列表**：打开最近访问过的条目 → 说明缓存来源和重试入口 → 打开长评论页并演示引用跳楼与跳底；没有实际测量就不报帧率。

如果面试官继续问“你最难的部分是什么”，可以选择自己已经理解并实际验证的一条讲透：**问题是什么 → 为什么原来的方式不够 → 具体实现 → 如何验证 → 仍有什么边界**。相比罗列所有功能，这样更能体现独立开发中承担的判断与责任。
