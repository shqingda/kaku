# Kaku 教程：从打开一部作品，到把它标成“看过”

Kaku 是一个 Bangumi 第三方手机客户端。这份教程只跟一条线走：**打开作品 42 → 看到标题和简介 → 把它标成“看过”**。沿着这条线，把手机端、后端、数据库里真正要懂的东西按出场顺序讲一遍。

**读之前你需要会：** JavaScript / TypeScript 的变量、函数、对象、数组、箭头函数，以及 React 组件的基本写法。其余概念（Promise、HTTP、缓存、事务、OAuth……）都在用到前解释，但只讲到够用为止。

**想先打底，可以读面试复习教程**（与本仓库同级的 `interview` 项目）里这几节，本教程不重复其中的原理细节：

| 本教程章节 | 先读 |
| --- | --- |
| 2 网络与异步 | [02 JavaScript 异步](../../interview/02_JavaScript_异步.md) §4–§10；[09 计算机网络](../../interview/09_计算机网络.md) §4 |
| 3 数据校验 | [03 TypeScript](../../interview/03_TypeScript.md) 运行时校验一节 |
| 4–6 界面、缓存、修改 | [06 React](../../interview/06_React.md) §2–§4、§10（含 TanStack Query） |
| 7 后端与登录 | [10 Web 安全与身份认证](../../interview/10_Web_安全与身份认证.md) §5–§8；[11 Node.js 与 Hono](../../interview/11_Node.js_与_Hono.md) §10 |
| 8 数据库与并发 | [13 事务与并发](../../interview/13_PostgreSQL_事务与并发.md) §1、§4；[15 消息队列](../../interview/15_消息队列与异步任务.md) §4 幂等 |

**代码标记：** `// 源码：路径` 是 Kaku 仓库里的真实代码（路径相对 `apps/mobile/src` 或写全）；`// 示例` 是为讲清楚概念单独写的，可以在浏览器控制台或 Node 里运行。

## 目录

1. [三个角色：手机、Kaku 后端、Bangumi](#1)
2. [向网络要数据：HTTP、Promise、超时](#2)
3. [别信外面来的数据：检查与转换](#3)
4. [把数据显示出来：组件状态与 TanStack Query](#4)
5. [缓存与离线：少等一次](#5)
6. [保存收藏：先显示，再确认](#6)
7. [后端：路由、身份、令牌](#7)
8. [数据库与并发：两个请求撞在一起](#8)
9. [测试、运行与排错](#9)
10. [附录：源码入口](#appendix)

---

<a id="1"></a>

## 1. 三个角色：手机、Kaku 后端、Bangumi

### 1.1 谁做什么

| 角色 | 职责 |
| --- | --- |
| **手机端**（`apps/mobile`） | 显示页面、响应点击、缓存数据 |
| **Kaku 后端**（`apps/api`） | 保管 Bangumi 登录凭据，验证“你是谁”，替你向 Bangumi 提交修改 |
| **Bangumi** | 真正保存作品资料、你的收藏和进度 |

一句话：**数据的最终版本在 Bangumi，Kaku 后端只管“替你登录、替你提交”。** Kaku 自己的数据库不存作品，只存会话、加密后的凭据、偏好设置这类东西。

### 1.2 读和写走不同的路

```text
读作品：手机 ──────────────→ Bangumi
写收藏：手机 ──→ Kaku 后端 ──→ Bangumi
```

为什么读不经过后端？作品资料是公开的，谁都能看，手机直接要更快。

为什么写要经过后端？修改收藏要用你的 Bangumi 凭据。凭据放在手机上容易泄露，所以留在后端，手机只拿一个 Kaku 自己发的“会话令牌”（第 7 章讲）。

### 1.3 一个仓库，三个程序

```text
kaku/
├── apps/mobile/     手机应用（Expo + React Native）
├── apps/api/        后端（Hono，跑在 Cloudflare Workers）
├── apps/web/        官网
└── packages/shared/ 几个程序共用的小类型和枚举
```

这叫 **monorepo**：多个程序放在同一个 Git 仓库，用 pnpm workspace 统一装依赖、跑命令。

注意：代码在一个仓库，不代表运行时在一起。手机跑在手机上，后端跑在 Cloudflare 的服务器上。它们不能互相读变量，只能**通过网络请求传数据**。共享的只是代码（比如同一个类型定义），不是内存。

### 练习

1. 手机断网时，还能修改 Bangumi 上的收藏吗？
2. 为什么不把 Bangumi 凭据直接存在手机上，让手机自己去改收藏？

<details><summary>答案</summary>

1. 不能。修改必须作为请求送达后端、再送到 Bangumi。Kaku 目前也没有“离线先记下、联网后补交”的队列。
2. 凭据在后端更安全：后端可以加密保存、统一撤销；手机上的代码和存储更容易被读取。另外 Bangumi OAuth 需要的 `client_secret` 本来就只能放在服务端。

</details>

---

<a id="2"></a>

## 2. 向网络要数据：HTTP、Promise、超时

### 2.1 一次 HTTP 请求长什么样

手机读作品 42，就是向 Bangumi 发一个 HTTP 请求：

```text
GET https://api.bgm.tv/v0/subjects/42
Accept: application/json
```

- **方法** `GET`：表示“读”。改数据一般用 `POST`、`PATCH` 等。
- **地址**：去哪里拿。
- **请求头**（header）：附加信息，比如“我想要 JSON 格式”。
- **请求体**（body）：要提交的内容。GET 一般没有。

服务器回一个**响应**：状态码 + 响应头 + 响应体。

| 状态码 | 含义 |
| --- | --- |
| 200 | 成功 |
| 400 | 你发的东西不合规矩 |
| 401 | 没登录或登录失效 |
| 404 | 找不到 |
| 5xx | 服务器自己出错 |

响应体通常是 **JSON**，一种用文本表示对象的格式：`{"id":42,"name":"..."}`。它到手时只是一串文字，要解析后才是 JavaScript 对象。

### 2.2 等待网络时，程序不能卡住

网络要几十毫秒到几秒。如果手机在这段时间什么都干不了，界面就冻住了。

JavaScript 的办法是 **Promise**：一个代表“将来会有结果”的对象。它有三种状态：等待中、成功（带结果）、失败（带错误）。

`async` / `await` 是使用 Promise 的写法：

```js
// 示例：用计时器模拟 100ms 后返回的网络请求
function fakeFetchSubject() {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ id: 42, title: '示例作品' }), 100);
  });
}

async function show() {
  console.log('开始');
  const subject = await fakeFetchSubject(); // 在这里等，但不卡别人
  console.log(subject.title);
}

show();
console.log('其他代码照常执行');
```

输出顺序：

```text
开始
其他代码照常执行
示例作品
```

`await` 只暂停**当前这个 async 函数**，函数外的代码继续跑。结果回来后，函数从 `await` 那一行接着往下走。

记住一点：async 不会让计算变快，也不会开新线程。它只是让“等待”不占着位置。

### 2.3 fetch 的一个坑：404 不算失败

浏览器和 React Native 都提供 `fetch` 发请求：

```js
// 示例
async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('请求失败：' + response.status);
  }
  return await response.json();
}
```

为什么要检查 `response.ok`？因为 **fetch 只在“根本没连上”时失败**。服务器回了 404 或 500，对 fetch 来说也是“成功收到了响应”。状态码要你自己查。

这个函数可能在三个地方出错：

1. `fetch(url)`：断网、DNS 失败。
2. `!response.ok`：服务器回了错误状态码。
3. `response.json()`：响应体不是合法 JSON。

调用方用 `try` / `catch` 接住任何一种：

```js
// 示例
try {
  const data = await readJson(url);
} catch (error) {
  // 显示“加载失败，请重试”
}
```

### 2.4 请求不能无限等

服务器可能一直不回。所以要设**超时**：最多等 12 秒，到点就放弃。

放弃请求用 `AbortController`：

```js
// 示例
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 12000);
try {
  const response = await fetch(url, { signal: controller.signal });
  // ...
} finally {
  clearTimeout(timer); // 不管成功失败，都清掉计时器
}
```

- `controller.signal` 交给 fetch。
- `controller.abort()` 一调用，fetch 立刻以 `AbortError` 失败。
- `finally` 里清计时器：请求 1 秒就成功了，剩下 11 秒的计时器没用了，要收掉。

### 2.5 Kaku 怎么做：一个集中的请求函数

每个页面都自己写超时、错误处理，迟早写得不一样。Kaku 把这些集中到一个工厂函数里：

```ts
// 源码：infrastructure/bangumi/transport/http-client.ts（节选）
const REQUEST_TIMEOUT_MS = 12_000;

export function createBangumiRequester(config: RequesterConfig) {
  return async function requestJson(path: string, options?: RequestOptions): Promise<unknown> {
    const controller = new AbortController();
    let didTimeout = false;
    const abortRequest = () => controller.abort();
    const timeout = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    // 调用方也可能想取消（比如用户离开页面）：把它的信号接到自己的 controller 上
    if (options?.signal?.aborted) {
      controller.abort();
    } else {
      options?.signal?.addEventListener('abort', abortRequest, { once: true });
    }

    try {
      const response = await fetch(`${config.baseUrl}${path}`, { /* headers… */ signal: controller.signal });
      if (!response.ok) {
        throw new BangumiRequestError(config.failedMessage(response.status), response.status);
      }
      return await response.json();
    } catch (error) {
      if (error instanceof BangumiRequestError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        if (!didTimeout && options?.signal?.aborted) throw error; // 调用方主动取消：原样抛出
        throw new BangumiRequestError(config.timeoutMessage);     // 超时
      }
      throw new BangumiRequestError(config.networkMessage);       // 其他：网络错误
    } finally {
      clearTimeout(timeout);
      options?.signal?.removeEventListener('abort', abortRequest);
    }
  };
}
```

拆开看它做了四件事：

1. **两种取消合并成一个**：自己的超时、调用方的取消，都会触发同一个 `controller.abort()`。
2. **用 `didTimeout` 区分原因**：同样是 `AbortError`，是超时还是用户离开？前者要提示用户，后者安静结束。
3. **错误统一成 `BangumiRequestError`**：页面只需认一种错误类型。
4. **`finally` 收尾**：清计时器、解除监听，不留垃圾。

`createBangumiRequester(config)` 返回一个函数，这个函数“记住”了 `config`。这种“函数记住外层变量”的现象叫**闭包**。用法就是：先配置一次，之后反复调用。

返回类型是 `Promise<unknown>`，意思是“我拿到了 JSON，但不保证它长什么样”。下一章检查它。

### 2.6 能并行的请求，就一起发

作品页要作品资料，也要章节列表。如果章节请求依赖作品类型，就得**先后发**。如果两者互不依赖，可以**同时发**：

```js
// 示例
const [subject, comments] = await Promise.all([readSubject(), readComments()]);
```

`Promise.all` 等所有请求都成功，按传入顺序返回结果；任何一个失败，整体失败。总等待时间约等于最慢那个，而不是相加。

### 练习

1. 服务器返回 200，但响应体是 `{"id":42,` （被截断了）。错误在哪一步抛出？
2. 用户进入作品页 0.5 秒后就退出了。Kaku 的请求函数会提示“请求超时”吗？

<details><summary>答案</summary>

1. 在 `response.json()`。状态码成功不保证内容完整。最终被 catch 包成“网络错误”类的 `BangumiRequestError`。
2. 不会。调用方的信号先触发，`didTimeout` 仍是 `false`，函数原样抛出 `AbortError`，上层知道这是主动取消，不显示错误。

</details>

---

<a id="3"></a>

## 3. 别信外面来的数据：检查与转换

数据从外面进来有两个入口：**页面地址里的参数**，和**服务器返回的 JSON**。两个都不能直接用。

### 3.1 检查地址里的作品编号

作品页地址是 `/subject/42`，路由给页面的编号是**字符串** `'42'`，不是数字。用户也可能点到坏链接 `/subject/abc`。

```ts
// 源码：lib/route-params.ts（完整）
export function parsePositiveIntegerRouteParam(value?: string) {
  if (!value || !/^\d+$/.test(value)) return undefined;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}
```

逐行：

1. `!value`：没传或空字符串，拒绝。
2. `/^\d+$/`：正则表达式，要求“从头到尾全是数字”。`'12x'`、`'-3'`、`'1.5'` 都过不了。
3. `Number(value)`：转成数字。
4. `Number.isSafeInteger`：太大的数（超过约 9×10¹⁵）JavaScript 存不精确，两个不同编号可能变成同一个数，所以拒绝。
5. `parsed > 0`：编号从 1 开始。

| 输入 | 结果 |
| --- | --- |
| `'42'` | `42` |
| `'0007'` | `7` |
| `'0'` | `undefined` |
| `'12x'` | `undefined` |
| 不传 | `undefined` |

返回 `undefined` 就表示“这不是有效编号”，页面据此不发请求，直接显示错误。

### 3.2 为什么 TypeScript 类型不够

你可能会想：给返回值写个类型不就行了？

```ts
// 示例
const subject = json as BangumiSubject;
```

`as` 只是告诉编译器“相信我，它是这个类型”。**运行时什么都不检查。** 如果 Bangumi 某天返回 `{"id":"42","name":null}`，代码照样往下跑，然后在 `name.trim()` 处崩掉。

TypeScript 检查的是**你写的代码**；网络上来的数据，要在**运行时**检查。

### 3.3 Kaku 用 Zod 做运行时检查

Zod 是一个校验库。你用它描述“数据应该长什么样”（叫 **schema**），然后让它检查实际数据：

```ts
// 示例
import { z } from 'zod';

const subjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  name_cn: z.string(),
});

subjectSchema.parse({ id: 42, name: 'A', name_cn: '甲' }); // 通过，返回数据
subjectSchema.parse({ id: '42', name: null });             // 抛错
```

- `parse`：通过就返回数据（类型也自动推出来了），不通过就抛错。
- `safeParse`：不抛错，返回 `{ success: true, data }` 或 `{ success: false, error }`，适合自己写 if 处理。

Kaku 的作品接口：

```ts
// 源码：infrastructure/bangumi/api-v0/client.ts
export async function getBangumiSubject(subjectId: number, signal?: AbortSignal) {
  const json = await requestJson(`/v0/subjects/${subjectId}`, { signal });
  return bangumiSubjectSchema.parse(json);
}
```

两步：第 2 章的 `requestJson` 拿到 `unknown`，`parse` 检查后变成有类型的数据。

### 3.4 把 Bangumi 的字段名换成 Kaku 的

Bangumi 的章节叫 `ep`、中文名叫 `name_cn`。Kaku 页面想用 `number` 和 `title`。转换代码叫**适配器**（adapter）：

```ts
// 源码：infrastructure/bangumi/catalog/provider.ts
function preferChineseName(chineseName: string, originalName: string) {
  return chineseName.trim() || originalName;
}
// …转换章节时：
//   title: preferChineseName(episode.name_cn, episode.name),
```

`chineseName.trim() || originalName`：中文名去掉空格后非空，就用中文名；否则用原名。（`||` 在左边是空字符串时取右边。）

为什么要这一层？假设 Bangumi 把 `ep` 改名为 `episode_number`。如果所有页面都直接写 `episode.ep`，就得一个个改；有了适配器，只改这一处，页面继续用 `number`。

### 3.5 小结：数据进页面前的流水线

```text
fetch → 检查状态码 → 解析 JSON → Zod 校验 → 适配器转换 → 交给页面
 └── 第 2 章 ──────────────────┘ └──────── 第 3 章 ────────┘
```

每一层只对付一种变化：网络出问题改第 2 章那层，字段变了改第 3 章那层，界面改版只动页面。这就是**分层**的意义。

### 练习

1. `parsePositiveIntegerRouteParam('9007199254740993')` 返回什么？为什么？
2. `preferChineseName('', '  Original  ')` 返回的字符串两端有空格吗？

<details><summary>答案</summary>

1. `undefined`。它超过了安全整数上限 `9007199254740991`，转换后不精确，`isSafeInteger` 返回 false。
2. 有。只对中文名做了 `trim()`，原名原样返回。

</details>

---

<a id="4"></a>

## 4. 把数据显示出来：组件状态与 TanStack Query

### 4.1 用 state 让界面跟着变

React 组件是一个返回界面描述的函数。要让界面随数据变化，数据得放在 **state** 里：

```tsx
// 示例
import { useState } from 'react';
import { Button, Text, View } from 'react-native';

export function StatusDemo() {
  const [status, setStatus] = useState('想看');
  return (
    <View>
      <Text>{status}</Text>
      <Button title="标为看过" onPress={() => setStatus('看过')} />
    </View>
  );
}
```

点按钮 → `setStatus('看过')` → React 重新调用组件函数（**重新渲染**）→ 这次 `status` 是 `'看过'` → 屏幕更新。

注意 `onPress={() => setStatus('看过')}` 传的是函数，点击时才执行。写成 `onPress={setStatus('看过')}` 就是渲染时立刻执行，错了。

这个例子**只改了手机上的显示**，没发任何请求。

### 4.2 state 与 ref 的区别

`useRef` 也能跨渲染记住值，但改它**不会触发重新渲染**：

| | 改了会刷新界面吗 | 用来存什么 |
| --- | --- | --- |
| `useState` | 会 | 要显示的东西 |
| `useRef` | 不会 | 计时器编号、上一次的值等“幕后记录” |

第 2 章源码里 `usePrefetchSubject` 用 `timerRef` 存计时器编号，就是这个道理：编号不用显示。

### 4.3 Effect：处理组件以外的事

计时器、事件订阅这类事情不属于“描述界面”，要放进 `useEffect`，并返回清理函数：

```tsx
// 示例
useEffect(() => {
  const timer = setTimeout(() => setShowPreview(true), 2500);
  return () => clearTimeout(timer); // 组件消失时收掉计时器
}, []);
```

组件出现在屏幕上叫**挂载**，离开叫**卸载**。卸载时 React 调用清理函数。不清理的话，组件没了计时器还在跑，回调去改一个不存在的组件的 state。

### 4.4 网络数据的四种状态

作品页不能只写“有数据就显示”。实际上有四种情况：

| 情况 | 应该显示 |
| --- | --- |
| 第一次加载，还没数据 | 加载提示 |
| 成功 | 内容 |
| 失败且没有数据 | 错误提示 + 重试按钮 |
| **有旧数据，正在刷新** | 保留旧内容 + 小的刷新提示 |

最后一种最容易漏。如果每次刷新都清空页面再转圈，用户会以为内容丢了。Kaku 的项目规则也写明：不许用空白加载态掩盖失败，离线、重试、失败都要明确显示。

### 4.5 TanStack Query：帮你管这四种状态

自己用 `useState` + `useEffect` 写请求，要处理：加载中、错误、重试、取消、缓存、多个页面共享同一份数据……很容易出错。Kaku 用 **TanStack Query** 统一管。

核心用法：给它一个**名字**（query key）和一个**取数据的函数**（queryFn），它返回当前状态：

```ts
// 源码：features/catalog/use-catalog-subject.ts（简化）
export function catalogSubjectQueryOptions(subjectId: number) {
  return queryOptions({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    queryKey: queryKeys.catalogSubject(subjectId, CATALOG_QUERY_VERSION),
    queryFn: async ({ signal }) => getCatalogSubject(subjectId, signal), // 实际还有离线回退，见第 5 章
    retry: shouldRetryBangumiQuery,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCatalogSubject(subjectId: number) {
  return useQuery(catalogSubjectQueryOptions(subjectId));
}
```

- `enabled`：编号无效就不发请求。
- `queryFn` 收到的 `signal`：页面离开时 Query 自动取消，正好接到第 2 章的请求函数。
- `retry`：失败后要不要重试，Kaku 自己写了判断函数（大多数 4xx 不重试，网络错误等最多重试两次）。
- `staleTime`：第 5 章讲。

页面里这样用：

```ts
// 源码：app/subject/[id].tsx（节选）
const catalogQuery = useCatalogSubject(subjectId ?? 0);
const catalogSubject = catalogQuery.data;
```

`catalogQuery` 上有 `data`、`isPending`、`isError`、`isFetching`、`refetch` 等，四种状态都能直接判断。`subjectId ?? 0`：编号无效时传 0 占位，`enabled` 会挡住它。

### 4.6 多个页面共用一个对象：Provider

Query 的缓存存在一个 `QueryClient` 对象里。所有页面必须用**同一个** QueryClient，才能共享缓存。React 的办法是在组件树最上层放一个 **Provider**，下面的组件都能拿到它提供的值。

Kaku 的根布局 `app/_layout.tsx` 在导航外层依次包了：QueryClient Provider、登录状态 `AuthProvider`、偏好、主题等。所以任何页面都能拿到同一个缓存和同一个登录状态。

### 练习

1. 把要显示的文字存进 `ref.current`，为什么屏幕不变？
2. 作品页已显示内容，用户下拉刷新失败了。应该清空页面显示错误吗？

<details><summary>答案</summary>

1. 改 ref 不会触发重新渲染。要显示的值得用 state（或 Query 的数据）。
2. 不应该。保留已有内容，另外提示“刷新失败”并给重试入口。

</details>

---

<a id="5"></a>

## 5. 缓存与离线：少等一次

### 5.1 Query key：缓存的名字

从作品页返回列表，再点进同一部作品，如果手机还留着刚才的结果，就可以立刻显示。这就是**缓存**。

缓存要按名字存取。Kaku 的作品 42：

```ts
// 源码：lib/query-keys.ts
catalogSubject: (subjectId: number, version: number) =>
  ['catalog-subject', 'bangumi', version, subjectId] as const,
// → ['catalog-subject', 'bangumi', 4, 42]
```

`version` 是数据格式版本。改了适配器输出的结构，就把版本加一，旧格式的缓存不会被误用。

个人收藏还必须带上用户：

```ts
// 源码：lib/query-keys.ts
['collections', 'kaku', userId ?? 'signed-out', subjectId]
```

同一部作品，用户 7 和用户 8 的收藏状态不同。key 里没有用户，切换账号就会看到别人的数据。

### 5.2 三个时间，别混

| 配置 | Kaku 的值 | 意思 |
| --- | --- | --- |
| `staleTime` | 作品 5 分钟 | 多久内认为数据**新鲜**，不需要重新请求 |
| `gcTime` | 全局 24 小时 | 没有页面使用后，内存里**留多久**再清掉 |
| 持久化 `maxAge` | 24 小时 | 磁盘上的缓存**多旧**还允许恢复 |

最常见的误解：**staleTime 到了不是删除，也不是定时刷新。** 它只是把数据标成“旧了”。下次有页面用它（或应用回到前台、重新联网），Query 会**先显示旧数据，同时后台重新请求**。

### 5.3 关掉 App 后：持久化

内存里的缓存，App 被系统杀掉就没了。把数据写到手机存储里，下次启动读回来，叫**持久化**。

Kaku 用 SQLite（手机上的小型数据库）以 key-value 方式存两类副本：

| 副本 | 用途 | 限制 |
| --- | --- | --- |
| 查询快照 | 下次启动先显示上次的数据 | 最多 100 个查询；分页列表只留前两页；总共 2 MiB |
| 作品离线包 | 网络失败时打开最近看过的作品 | 最近 10 个作品，30 天有效；不保证图片 |

限制是为了不让启动时读太多数据拖慢速度。

注意：**修改操作不持久化**。能离线看，不等于能离线改。

### 5.4 网络失败时，读离线包

```ts
// 源码：features/catalog/use-catalog-subject.ts（queryFn 部分）
queryFn: async ({ signal }) => {
  try {
    const subject = await getCatalogSubject(subjectId, signal);
    if (signal.aborted) { /* 已取消：抛 AbortError，不保存 */ }
    // 后台保存离线包，不等它，失败只记日志
    void saveOfflineSubject(subject).catch((error) => { void recordDiagnosticError(/* … */); });
    return subject;
  } catch (error) {
    if (signal?.aborted) throw error;           // 主动取消的，不找替代品
    const packed = await loadOfflineSubject(subjectId);
    if (signal?.aborted) throw error;
    if (packed) return packed;                  // 有离线包就用
    throw error;                                // 没有就报错
  }
},
```

流程：

```text
网络请求
 ├ 成功 → 显示，后台存离线包
 └ 失败 → 是用户取消的？ → 是：结束
                         → 否：找离线包 → 有：显示副本 / 没有：报错
```

两个细节：

- `void saveOfflineSubject(...)`：不 `await`，让存储不挡住显示。`void` 只是表示“故意不用返回值”，`.catch` 才是真正处理错误。
- **反复检查 `signal.aborted`**：用户清了缓存、取消了请求，一个迟到的响应不应该又把离线包写回来。每次 `await` 之后世界都可能变了，所以要再查一次。这个“await 之后重新检查”的习惯，第 6、8 章会反复用到。

### 5.5 预取：在用户点之前就开始

缓存是“读过的留着”，**预取**是“猜用户马上要看，提前读”。

Kaku 在手指**按下**作品卡片时，等 50 毫秒再预取；如果手指只是滑过（松开或滑动会取消），计时器被清掉，请求不会发出：

```ts
// 源码：features/catalog/use-catalog-subject.ts（usePrefetchSubject 内）
timerRef.current = setTimeout(() => {
  prefetchCatalogSubject(queryClient, subjectId);
  timerRef.current = null;
}, 50);
```

等用户真正抬手进入作品页，数据可能已经在缓存里了。

### 练习

1. 作品数据已经超过 5 分钟，打开作品页时会先白屏等待吗？
2. 昨天看过的作品，今天断网打不开，可能是什么原因？

<details><summary>答案</summary>

1. 不会。数据只是“旧了”，Query 先显示它，同时后台刷新。
2. 离线包当时可能没存成功（后台保存失败只记日志）；或者它已被挤出最近 10 个；或者超过 30 天。

</details>

---

<a id="6"></a>

## 6. 保存收藏：先显示，再确认

### 6.1 选中 ≠ 保存成功

原来是“想看”，你在编辑框里选了“看过”。此时：

| 位置 | 值 |
| --- | --- |
| 编辑框 | 看过 |
| 手机缓存 | 想看 |
| Bangumi | 想看 |

点“保存”后才发请求；Bangumi 确认后，它那边才是“看过”。中间任何一步都可能失败。

### 6.2 乐观更新

如果点保存后转圈等 1 秒，体验很差。常见做法是**乐观更新**：先假设会成功，立刻把界面改成“看过”；请求失败再改回来。

TanStack Query 里，读叫 **query**，写叫 **mutation**。`useMutation` 把一次修改分成几个阶段：

| 阶段 | 做什么 |
| --- | --- |
| `onMutate` | 发请求**前**：取消正在进行的读取，记下旧值，先改缓存 |
| `mutationFn` | 真正发请求 |
| `onSuccess` | 成功：用服务器返回的结果覆盖缓存，让相关列表刷新 |
| `onError` | 失败：恢复旧值，重新读一次确认 |

### 6.3 Kaku 的实现

```ts
// 源码：features/collections/use-personal-collection.ts（节选）
const mutation = useMutation({
  scope: { id: JSON.stringify(queryKey) },
  retry: false,
  mutationFn: async ({ update, scope, subjectId }) => {
    if (!scope.isCurrent()) throw new AuthSessionChangedError();
    const collection = await savePersonalCollection(scope.request, subjectId, update);
    if (!scope.isCurrent()) throw new AuthSessionChangedError();
    return collection;
  },
  onMutate: async ({ update, scope, subjectId }) => {
    if (!scope.isCurrent()) throw new AuthSessionChangedError();
    const queryKey = queryKeys.personalCollection(scope.identity.userId, subjectId);
    await queryClient.cancelQueries({ queryKey });
    if (!scope.isCurrent()) throw new AuthSessionChangedError();
    const previous = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, mergePersonalCollection(previous, update, subjectId));
    return { previous };
  },
  onError: (_error, { scope, subjectId }, context) => {
    if (!scope.isCurrent()) return;
    const queryKey = queryKeys.personalCollection(scope.identity.userId, subjectId);
    if (context) queryClient.setQueryData(queryKey, context.previous);
    void queryClient.invalidateQueries({ queryKey });
  },
  // onSuccess：setQueryData(结果) + invalidateQueries(收藏列表)
});
```

先忽略 `scope.isCurrent()`（6.5 讲），看主线：

1. **`cancelQueries`**：为什么先取消读取？假设一个读请求在保存前发出、在保存后才回来，它带的是旧值“想看”，会把刚显示的“看过”盖掉。
2. **`getQueryData` + `setQueryData`**：记下旧值，再写入新值。`mergePersonalCollection` 生成新对象，不修改旧对象，旧值才能原样保留。
3. **`onError` 恢复 + `invalidateQueries`**：`invalidateQueries` 把缓存标为过期并触发重新读取，以服务器为准。
4. **`scope: { id }`**：同一条收藏的修改排队一个个执行，连点两次不会互相覆盖。
5. **`retry: false`**：修改失败不自动重试（原因见下节）。

### 6.4 超时了，到底保存了没有？

```text
手机：发出“改为看过”
Bangumi：已保存
网络：响应在路上丢了
手机：等待超时
```

Bangumi 已经是“看过”，手机却以为失败了。所以失败要分三种：**明确成功、明确失败、结果不明**。结果不明时，只能重新读一次去确认，不能断定“没保存”。

那能不能直接再发一次？要看操作是不是**幂等**的：执行一次和执行多次结果一样。“设为看过”重复执行没问题；“进度 +1”重复执行就会多加。一次收藏保存可能包含好几个写入步骤，所以 Kaku 不让 mutation 自动重试，失败就回滚并重新读取。

### 6.5 请求回来时，账号可能已经换了

```text
账号 A 发出保存请求
用户退出 A，登录 B
A 的请求返回
```

返回的结果是 A 的，不能写进 B 的界面。这类“结果取决于事件先后顺序”的问题叫**竞态**（race condition）。JavaScript 是单线程的，照样会发生，因为每个 `await` 都是一个“世界可能变了”的缝隙。

Kaku 的解法：发起操作时用 `captureRequest()` 拍一张快照（`scope`），记下当时的用户、会话和 **authEpoch**；每过一个 `await` 就用 `scope.isCurrent()` 检查快照是否还有效。

为什么还要 authEpoch，只比用户编号不行吗？看这个顺序：A 发请求 → 退出 A → 登录 B → 又登录 A → 第一个请求才回来。用户编号又是 A 了，但中间已经退出过。authEpoch 是“第几段连续登录”，退出或切换都会让它变化，所以能识别出来。（普通的令牌刷新不算换人，不改 authEpoch。）

### 6.6 只提交改过的字段

表单打开时：评分 7、进度 3。你只改评分为 8。同时另一台设备把进度改成 4。

如果提交整个表单 `{"rating":8,"progress":3}`，就把另一台设备的进度改回了 3。只提交 `{"rating":8}` 就没问题。

Kaku 的收藏表单会和打开时的快照比较，只发用户真正改过的字段。这能避免覆盖你没碰的字段；两台设备同时改**同一个**字段，还需要第 8 章的条件检查。

### 练习

1. 保存超时后，界面恢复成“想看”。这能证明 Bangumi 上还是“想看”吗？
2. 为什么在 `cancelQueries` 的 `await` 之后要再检查一次 `scope.isCurrent()`？

<details><summary>答案</summary>

1. 不能。那只是手机改了自己的缓存。`invalidateQueries` 触发的重新读取才能告诉你真实结果。
2. `await` 期间用户可能已经切换账号。不再查一次，就会把旧账号的乐观更新写进新账号的缓存。

</details>

---

<a id="7"></a>

## 7. 后端：路由、身份、令牌

### 7.1 路由：按地址找处理函数

保存请求到达 Kaku 后端。后端要按“方法 + 路径”找到对应代码，这叫**路由**。Kaku 用 Hono 框架：

```ts
// 源码：apps/api/src/app.ts
app.get('/health', (context) =>
  context.json({
    service: 'kaku-api',
    status: 'ok',
  }),
);
```

`GET /health` 来了，Hono 调用这个函数，`context` 里有请求内容和生成响应的方法。

### 7.2 中间件：所有请求先过一道

有些检查每个请求都要做，比如**限流**（同一来源短时间请求太多就拒绝）。这类“包在业务外面”的代码叫**中间件**：

```ts
// 示例
app.use('*', async (context, next) => {
  const rejection = await checkRateLimit(context);
  if (rejection) return rejection; // 拒绝：直接返回，不往下走
  await next();                    // 放行：交给下一个处理者
});
```

关键在 `next()`：调用它才进入后面的处理。拒绝时忘了 `return`、继续调用 `next`，就等于没拦。

### 7.3 后端必须自己再检查一遍输入

手机界面只给用户合法选项，但任何人都可以绕过 App 直接发 HTTP 请求。所以后端用 Zod 的 `safeParse` 再检查一次请求体，不合格返回 400。**前端校验是为了体验，后端校验是为了安全。**

### 7.4 “你是谁”不能听手机自己说

如果请求里写 `userId: 7`，后端就改用户 7 的收藏，那谁都能冒充别人。

后端需要一个手机伪造不了的凭证。登录后，手机拿到一段很长的随机字符串，叫**会话令牌**（session token），之后每个请求都带上：

```http
Authorization: Bearer <会话令牌>
```

后端收到后查数据库：这个令牌对应哪个会话？过期了吗？撤销了吗？查到有效会话，才知道“你是用户 7”。

- **认证**：你是谁。
- **授权**：你能不能做这件事。认证你是用户 7，不代表你能改用户 8 的数据。

### 7.5 令牌怎么存：摘要 vs 加密

后端要存两种凭据，存法不同：

**Kaku 会话令牌 → 存摘要。** 摘要（hash）是用 SHA-256 这类算法从原文算出的固定长度结果，**算不回原文**。后端只需要判断“收到的令牌对不对”：收到后再算一次摘要，去数据库查。这样即使数据库泄露，攻击者也拿不到能用的令牌。

```ts
// 源码：apps/api/src/auth/session-service.ts
const tokenHash = await hashToken(token);
const session = await store.authenticateSession(tokenHash, now);
```

**Bangumi 令牌 → 加密。** 后端要拿原文去调用 Bangumi，所以必须能还原。加密就是用密钥把原文变成密文，有密钥才能解回来。Kaku 用 AES-GCM：

```ts
// 源码：apps/api/src/auth/crypto.ts（encryptSecret 内）
const iv = crypto.getRandomValues(new Uint8Array(12));
const key = await importEncryptionKey(base64Key);
const encrypted = await crypto.subtle.encrypt(
  { iv, name: 'AES-GCM' },
  key,
  new TextEncoder().encode(value),
);
```

- `TextEncoder().encode`：加密算法处理字节，先把字符串变成字节。
- `iv`：每次加密随机生成的 12 字节初始值。同一个密钥下 IV 绝不能重复，否则加密会被破解。
- AES-GCM 还能发现密文被篡改。

顺带：**Base64 只是编码，不是加密**。它把字节变成可打印的文字，谁都能解回来。

手机这边，Kaku 会话令牌存在 SecureStore（系统钥匙串）里，不放普通缓存。

### 7.6 登录流程：OAuth 与交接码

用户怎么把 Bangumi 的权限交给 Kaku，又不把密码给 Kaku？用 **OAuth**：用户在 Bangumi 自己的页面上点“同意”，Bangumi 给 Kaku 后端一个授权码，后端用它换取 Bangumi 令牌。

问题是：后端拿到了 Bangumi 令牌，怎么把“登录成功”安全地交回手机？Kaku 的做法：

```text
1. 手机生成随机串 verifier，存在本机；把它的 SHA-256 摘要（challenge）发给后端
2. 后端返回 Bangumi 授权页地址，手机用浏览器打开
3. 用户在 Bangumi 同意；Bangumi 带着授权码回调 Kaku 后端
4. 后端换到 Bangumi 令牌，加密存库；生成一次性“交接码”，用深链唤起 App
5. App 把交接码 + 原始 verifier 交给后端
6. 后端核对：verifier 的摘要 == 当初的 challenge？对了才发 Kaku 会话令牌
```

**深链**是能唤起 App 的地址（如 `kaku://...`）。深链可能被别的 App 截获，所以光有交接码不够；只有最初发起登录的那台手机持有 verifier。这个“先给摘要、后给原文”的技巧来自 OAuth 的 PKCE 规范。

各种凭据一览：

| 凭据 | 谁持有 | 有效期 | 用途 |
| --- | --- | --- | --- |
| 交接码 | App（短暂） | 60 秒，一次性 | 领取登录结果 |
| 会话令牌 | 手机 SecureStore；后端存摘要 | 1 小时 | 调 Kaku API |
| 刷新令牌 | 手机 SecureStore；后端存摘要 | 90 天 | 会话过期后换新令牌 |
| Bangumi 令牌 | 仅后端，加密 | 由 Bangumi 定 | 后端调 Bangumi |

会话 1 小时就过期，手机碰到 401 会用刷新令牌换一个新的，再重试一次请求。每次刷新，刷新令牌也会换新，旧的立刻作废。

### 练习

1. 如果后端只存 Bangumi 令牌的摘要，还能用它调 Bangumi 吗？
2. 有人截获了深链里的交接码，能登录吗？

<details><summary>答案</summary>

1. 不能。摘要算不回原文。所以 Bangumi 令牌用可解密的加密；Kaku 令牌只需比对，才用摘要。
2. 不能。领取时还要提供 verifier，它只在发起登录的手机里，从未出现在深链上。

</details>

---

<a id="8"></a>

## 8. 数据库与并发：两个请求撞在一起

### 8.1 表、行、主键

Kaku 后端用 Cloudflare D1，一个 SQLite 兼容的数据库。数据存在**表**里：一列是一个字段，一行是一条记录。

```text
users                     sessions
user_id | username        session_id | user_id | device
7       | learner         phone-a    | 7       | 手机
                          tablet-b   | 7       | 平板
```

一个用户可以有多个会话（多台设备），这叫**一对多**。所以“手机退出、平板还登着”很好表达：删一行会话就行。

- **主键**：唯一确定一行的字段，比如 `session_id`。
- **外键**：`sessions.user_id` 指向 `users.user_id`，数据库保证不会指向一个不存在的用户。

Kaku 用 Drizzle ORM 在 TypeScript 里定义表（`apps/api/src/db/schema.ts`），不必手写建表 SQL。

### 8.2 SQL 查询和参数

```sql
-- 示例
SELECT session_id, device FROM sessions WHERE user_id = ?;
```

`?` 是参数占位，执行时由程序传入值。**永远别把用户输入拼接进 SQL 字符串**，否则输入里的 SQL 片段会被当成命令执行（SQL 注入）。

### 8.3 条件更新：先确认没人动过

刷新令牌时，要把会话的摘要从 old 换成 new。但同时可能有另一个请求也在刷新。

```sql
-- 示例
UPDATE sessions SET token_hash = ? WHERE session_id = ? AND token_hash = ?;
--                              new                   id                  old
```

把“还是 old 吗”写进 `WHERE`。如果别人已经改过，条件不成立，**影响 0 行**。

要点：**SQL 没报错不等于成功**，要检查影响行数。“检查”和“修改”在一条语句里完成，中间不会被插队，这叫**原子操作**。如果先 SELECT 看一眼、再 UPDATE，两步之间就可能被别人改掉。

### 8.4 事务：要么全成，要么全不成

有时一次业务要写两张表。写了第一张、第二张失败，就留下半套数据。**事务**把多个操作绑在一起：全部成功才**提交**；任何一步失败就**回滚**，像什么都没发生过。D1 的 `batch()` 就是这样执行一组 SQL。

但事务只管**这一个数据库**。D1 回滚了，已经发给 Bangumi 的 HTTP 请求撤不回来。跨系统的操作，程序要自己记住“做到哪一步了”。

### 8.5 多台服务器之间的“锁”

同一个用户在手机和平板上同时改作品 42 的进度。手机端的 mutation 排队管不到另一台设备；后端也不只一个实例在跑，一个实例内存里的变量，另一个实例看不到。

所以协调要放在**大家都能看到的地方**：数据库。

```ts
// 源码：apps/api/src/db/schema.ts
export const collectionWriteLocks = sqliteTable('collection_write_locks', {
  userId: integer('user_id').notNull(),
  subjectId: integer('subject_id').notNull(),
  operationId: text('operation_id').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.subjectId] })]);
```

`(userId, subjectId)` 一起做主键（**联合主键**），所以同一用户、同一作品最多一行。写入前先插一行“占位”：

```ts
// 源码：apps/api/src/collections/write-lock.ts（withCollectionWriteLock 内）
const operationId = crypto.randomUUID();
const claim = await database.prepare(
  'INSERT INTO collection_write_locks (user_id, subject_id, operation_id, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (user_id, subject_id) DO NOTHING',
).bind(userId, subjectId, operationId, now).run();
if (claim.meta.changes !== 1) throw unconfirmed(); // 423：别人正在写
```

`ON CONFLICT ... DO NOTHING`：已有一行就什么都不做。插入了 1 行，说明拿到写权限；0 行，说明别人在写，返回 423。这又是“检查 + 修改”合在一条语句里的原子操作。写完后按自己的 `operationId` 删掉这行。

如果 Bangumi 超时、结果不明，占位**不会自动过期**。宁可让后续写入等待人工确认，也不能让第二次写入盖掉一次说不清结果的写入。

这个保护只管经过 Kaku 的请求。用户在 Bangumi 网页上直接改，Kaku 管不到。

### 8.6 批量改进度：确认起点没变

“把进度设到第 12 集”会一次改很多章节。手机会带上打开编辑框时看到的已看章节列表，叫**基线**。后端写入前先拿基线和 Bangumi 当前状态比较：

- 没带基线：返回 **428**（Precondition Required，缺少前提条件）。
- 基线和当前不一致（别处改过）：返回 **412**（Precondition Failed，前提不成立）。

检查通过才写入。多个上游写入只成功一部分时，手机保留用户的编辑，要求先刷新确认，不盲目重试。

### 8.7 表结构变了，数据库不会自己变

在 `schema.ts` 里加一列，线上数据库不会自动多出这一列。要写**迁移**（migration）：一个明确的“给某表加某列”的脚本，按顺序在数据库上执行。Kaku 的迁移在 `apps/api/drizzle/`，本地用 `pnpm --filter @kaku/api db:migrate:local` 执行。

### 练习

1. 条件更新没报错，影响 0 行。能告诉用户“保存成功”吗？
2. 为什么写入占位要存在 D1，而不是后端内存里的一个 Map？

<details><summary>答案</summary>

1. 不能。没有任何一行满足条件：可能记录不存在、已被别人改过，或会话已失效。要进一步区分。
2. 后端有多个实例，各有各的内存。只有数据库是所有实例共享的。

</details>

---

<a id="9"></a>

## 9. 测试、运行与排错

### 9.1 先写规则，再写测试

给标题选择加一条规则：中文名和原名去掉空格后都为空，显示“未命名条目”。先把规则写成表：

| 中文名 | 原名 | 期望 |
| --- | --- | --- |
| `'  中文  '` | `'Orig'` | `'中文'` |
| `'   '` | `'  Orig  '` | `'Orig'` |
| `''` | `'   '` | `'未命名条目'` |

再把表变成可执行的检查。保存为 `title.test.mjs`：

```js
// 示例
import assert from 'node:assert/strict';
import test from 'node:test';

function chooseTitle(cn, original) {
  return cn.trim() || original.trim() || '未命名条目';
}

test('标题选择', () => {
  assert.equal(chooseTitle('  中文  ', 'Orig'), '中文');
  assert.equal(chooseTitle('   ', '  Orig  '), 'Orig');
  assert.equal(chooseTitle('', '   '), '未命名条目');
});
```

```bash
node --test title.test.mjs
```

`assert.equal(实际, 期望)`：不相等就报错。

### 9.2 让时间和网络听测试的

测“过期判断”，不用真等 1 小时。把“取当前时间”作为参数传进来：

```js
// 示例
function isExpired(expiresAt, now) {
  return now() >= expiresAt;
}
isExpired(1000, () => 999);  // false
isExpired(1000, () => 1000); // true
```

真实代码传 `Date.now`，测试传一个返回固定值的函数。这叫**依赖注入**：把外部依赖（时间、网络、存储）当参数传入。Kaku 的 `createApp(dependencies)` 就接收 `now`、`fetcher` 等，测试时换成假的。

### 9.3 测试竞态：自己控制响应何时回来

第 6 章的“账号切换”问题，靠 `setTimeout` 碰运气测不准。让测试自己决定响应什么时候到：

```js
// 示例：保存为 race.test.mjs，用 node --test 运行
import assert from 'node:assert/strict';
import test from 'node:test';

test('旧账号的响应不改当前界面', async () => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });

  let currentUser = 'A';
  let visible = 'A 的旧状态';

  async function save() {
    const startedBy = currentUser;
    const result = await pending;
    if (currentUser !== startedBy) return; // 身份检查
    visible = result;
  }

  const saving = save();
  currentUser = 'B';
  visible = 'B 的状态';
  release('A 的新状态'); // 测试决定此刻放行
  await saving;

  assert.equal(visible, 'B 的状态');
});
```

试着删掉“身份检查”那行，测试应该失败。**一个删掉被测逻辑还能通过的测试，什么也没测。**

这个例子只比较用户名，抓不到 A→B→A。真实代码用 authEpoch 才能抓到（6.5）。

### 9.4 不同的检查，发现不同的问题

| 检查 | 能发现 | 发现不了 |
| --- | --- | --- |
| 类型检查 `pnpm typecheck` | 参数类型传错 | 网络数据不合规 |
| 函数测试 `node --test` | 边界条件、错误分支 | 页面有没有调用这个函数 |
| 组件测试（Jest） | 点击后显示什么 | 真机手势、原生能力 |
| 设备测试 | 真实导航和交互 | 很难覆盖所有错误输入 |

项目里现成的例子：

```bash
node --test apps/mobile/tests/route-params.test.mjs
```

### 9.5 跑起来

```bash
pnpm install
```

```bash
pnpm dev:mobile
```

`pnpm dev:mobile` 实际执行 `pnpm --filter @kaku/mobile start`：`--filter` 选中手机这个包，跑它自己的 `start` 脚本。

本地后端：

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

```bash
pnpm --filter @kaku/api db:migrate:local
```

```bash
pnpm dev:api
```

注意迁移命令带的是 `local`。带 `remote` 的会改线上数据库。

几个容易混的东西：

- **Metro**：给开发版 App 提供 JavaScript 代码的打包服务。Metro 启动了，不代表本地 API 启动了。
- **只改 JS** 可以热更新；**加了原生依赖**要重新构建 App（`pnpm --filter @kaku/mobile ios`）。
- **`EXPO_PUBLIC_KAKU_API_URL`** 决定手机连哪个后端。不设置就连线上。`EXPO_PUBLIC_` 开头的变量会打进 App，**不能放密钥**。
- **localhost**：真机上的 `localhost` 是真机自己，不是你的 Mac。

### 9.6 出错时，先找停在哪一步

沿着第 2～6 章的流水线排查：

| 现象 | 先查 |
| --- | --- |
| 点开作品提示编号无效 | 路由参数和 `parsePositiveIntegerRouteParam` 的结果 |
| 一直没响应 | 请求地址、网络、是否超时 |
| 状态码 200，页面仍报错 | JSON 解析、Zod 校验 |
| 有数据但没显示 | 页面的显示条件 |
| 保存后列表还是旧的 | query key 是否一致、是否 invalidate |
| 换账号后出现旧提示 | 请求发起和返回时的身份（scope） |
| 真机连本地 API 失败 | 地址是不是 localhost |

先固定一个能复现的步骤，一次只改一个条件。

### 练习

1. 删掉 9.3 里的身份检查，测试还通过了。说明什么？
2. Mac 上本地 API 已启动，真机请求 `http://localhost:8787` 失败。先改代码吗？

<details><summary>答案</summary>

1. 测试没有真的制造出“账号切换后旧响应回来”的场景，或者断言没检查被影响的值。
2. 不改。真机的 localhost 指真机自己。先把地址换成 Mac 在局域网里的 IP，确认请求能到达。

</details>

---

<a id="appendix"></a>

## 附录：源码入口

路径相对 Kaku 仓库根目录。建议第一次只沿一条线读：**作品页 → 作品查询 → 适配器 → 请求函数 → 收藏修改 → 后端会话 → 表结构**。

| 内容 | 文件 |
| --- | --- |
| HTTP 请求、超时、取消 | `apps/mobile/src/infrastructure/bangumi/transport/http-client.ts` |
| 作品接口与 Zod 校验 | `apps/mobile/src/infrastructure/bangumi/api-v0/client.ts` |
| 字段转换、标题选择 | `apps/mobile/src/infrastructure/bangumi/catalog/provider.ts` |
| 路由编号检查 | `apps/mobile/src/lib/route-params.ts` |
| 作品查询、离线回退、预取 | `apps/mobile/src/features/catalog/use-catalog-subject.ts` |
| 离线包 | `apps/mobile/src/features/catalog/offline-subject-pack.ts` |
| Query key | `apps/mobile/src/lib/query-keys.ts` |
| 缓存持久化规则 | `apps/mobile/src/lib/query-persistence.ts` |
| 根布局与 Provider | `apps/mobile/src/app/_layout.tsx` |
| 作品页 | `apps/mobile/src/app/subject/[id].tsx` |
| 收藏读取与修改 | `apps/mobile/src/features/collections/use-personal-collection.ts` |
| 登录状态、authEpoch | `apps/mobile/src/features/auth/auth-provider.tsx` |
| 后端入口与路由 | `apps/api/src/app.ts` |
| 会话认证 | `apps/api/src/auth/session-service.ts` |
| 摘要与加密 | `apps/api/src/auth/crypto.ts` |
| 表结构 | `apps/api/src/db/schema.ts` |
| 后端收藏接口 | `apps/api/src/collections/routes.ts` |
| 整体架构 | `docs/architecture.md` |
| 测试方法 | `docs/development/testing.md` |

本教程对照 Kaku 提交 `d4589dd`（2026-10-24）。
