# 兼容缺口复核：移动端 Web、Sentry Router、quick-actions（2026-10-26）

接续 [SDK 58 记录](2026-10-24-expo-58.md) 的已知限制。不需要实机；未改动指定 iOS 模拟器。

## 移动端 Web

### 已修复：打包与静态渲染

1. `wa-sqlite.wasm` 无法解析：Metro 默认不把 `.wasm` 视为资源。按 expo-sqlite Web 配置在
   `apps/mobile/metro.config.js` 加入 `assetExts.push('wasm')`，开发服务器补
   COEP `credentialless` / COOP `same-origin`（wa-sqlite 需要 SharedArrayBuffer）。原生端不引用
   `.wasm`；iOS 导出复核通过。
2. 解决打包后，静态渲染报 “The imperative router is unavailable before the first render has
   finished”。来源是 `InvalidRouteState` 在渲染期间调用 `router.canGoBack()`。这在原生端同样
   有风险：无效深链接作为首个页面打开时会抛错。改为渲染安全的 `useNavigation().canGoBack()`，
   并顺手把该屏的字号和间距迁移到 `TYPE` / `SPACING`。测试中的 router mock 现在与真实行为一致，
   渲染期调用即抛错；旧实现无法通过。

`expo export --platform web` 现在成功，输出 49 条静态路由及 wasm。用带隔离头的本地静态服务
（`localhost:3310`，临时）打开：首页与设置页可渲染，`crossOriginIsolated === true`。

### 仍受阻：Web 本机存储不可用（上游 expo-sqlite 58.0.14）

设置页明确显示“本机偏好暂时无法读取……请重试读取”，搜索/浏览历史同样显示失败与重试，
没有静默空白，符合显式失败要求。根因定位：

- 直接调用 kv-store 返回 `no such table: storage`；建表时返回 `unable to open database file`，
  worker 打印 `cannot create file`。
- 清空该临时源的 OPFS 后重开仍复现。OPFS 池中每个文件头记录的路径都是 `0.xxxx`，即
  `Math.random().toString(36)`：`AccessHandlePoolVFS.jOpen` 收到的文件名为空，主库和日志文件
  每次都落到新的随机文件且不释放，6 个池槽很快耗尽。
- `sqlite-api.js` 的 `open_v2` 用 cwrap 的 `'s'` 参数在栈上传文件名，同时以异步方式调用
  （`zVfs` 已改用堆分配，文件名没有）。推断：调用让出后栈被回收，VFS 读到的是失效内存。
  这是基于代码的推断，未通过修改第三方代码验证。
- 上游相近报告 [expo/expo#39903](https://github.com/expo/expo/issues/39903) 已关闭，方案为清空
  OPFS；本次在清空后仍复现，因此不是同一个残留问题。expo-sqlite 最新版仍为 58.0.14。

另：线上 API 未对 `localhost` 来源放行 CORS，`/config` 请求被浏览器拦截。这是 API 的安全
边界，本次不放开。移动端 Web 仍不是产品目标；独立官网不受影响。

## Sentry 可选 Expo Router 集成

- Sentry 8.28 与最新的 8.32 都 `require('expo-router/build/global-state/router-store')`；
  expo-router 58 已删除该文件。Expo SDK 58 配套版本为 `~8.28.0`。
- 该 require 包在 try/catch 中，失败时返回 null：只影响默认 `expoRouterIntegration` 给导航
  span 和路由错误边界附加路由名，崩溃与错误捕获不受影响。本应用未显式使用这两项。
- 上游 [getsentry/sentry-react-native#6901](https://github.com/getsentry/sentry-react-native/issues/6901)
  仍为 OPEN。不加 Metro 别名掩盖警告，等上游修复后升级。
- 同仓库还有一个 OPEN 的
  [getsentry/sentry-react-native#6918](https://github.com/getsentry/sentry-react-native/issues/6918)
  （Android release 包致命 JS 错误未刷新即丢失），与 O1 真实上报验收相关，需在设备验收时留意。

## expo-quick-actions TypeScript peer 警告

npm 最新版仍为 6.0.2，没有可升级版本；警告来自其旧构建工具链的间接依赖。保持不掩盖、
不降级项目 TypeScript。

## 验证

| 检查 | 结果 |
| --- | --- |
| mobile `tsc --noEmit` | 通过 |
| mobile UI 测试（`pnpm test:ui`） | 68 套件、451 项通过 |
| `expo export --platform web` | 成功，49 条静态路由 |
| `expo export --platform ios` | 成功 |
| 浏览器打开导出产物 | 页面渲染；本机存储显式失败，原因见上 |
