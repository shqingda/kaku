# 内容发布的应用内验证

原生端的发布编辑器在点击发布后加载 Bangumi 官方 HTTPS 验证页，使用
`react-native-webview` 接入 Turnstile。Expo web 暂时保留原来的系统浏览器流程。

已覆盖动态、条目/小组话题新建、条目/小组话题回复、剧集评论、日志/长评回复、
人物评论和角色评论，包括回复已有评论。编辑回复仍直接保存，不额外增加验证。
三个编辑器共用 `PublishProgress`，统一等待和取消入口。
后端另有动态删除验证接口，但客户端尚无对应操作入口，不在本次发布迁移范围。

## 状态与约束

- 编辑器不显示常驻验证说明。点击发布后，按钮转圈并显示「正在发布…」，超过 8 秒
  改为「还在发布，请稍候」，覆盖自动检查和网络提交两个阶段。自动检查阶段可取消发布；
  开始提交请求后不再提供取消，以免造成已发送却显示取消的误解。
  WebView 保持真实尺寸、原生默认 User Agent
  和默认持久化网站存储，但不占用可见验证区域。
- 收到 Cloudflare `before-interactive-callback` 才展示验证区域并收起键盘；
  展示过程中不重新挂载 WebView。使用 `appearance: interaction-only`。
- 成功凭证立即用于一次发布，不缓存、不记录日志、不复用。自动验证 30 秒超时；
  需要交互时给予 120 秒。错误、过期、网络失败和 WebView 进程退出都有明确提示。
- 取消、卸载编辑器、外部关闭或切换账号会拒绝当前等待；旧尝试的迟到回调无法完成新尝试。
  发布 mutation 不排队等待联网，也不自动重试。草稿仍由原来的草稿机制管理。
- 只允许官方验证页作为顶层页面；Cloudflare 和 `about:blank` / `about:srcdoc`
  仅用于子框架。消息只接受官方验证页面 URL、已知事件和最长 2048 字符的凭证。
  不向 WebView 注入 OAuth 凭据或待发布正文，不允许外部窗口和深链跳转。

## 上游页面契约

`inline-turnstile-bridge.ts` 在 document-end 注入，包装官方页面的 `window.onload`
渲染函数，保留官方传入的 sitekey / theme，追加 Cloudflare 文档规定的回调。
若注入晚于页面 load，则移除旧 widget，使用同一官方渲染函数重建一次。
不下载页面再伪造 origin、不把验证转移到代理服务器、不关闭上游校验。

这是对上游页面结构的明确依赖：如果 Bangumi 改变初始化方式，需要调整桥接。
结构异常会失败或到达明确超时，保留草稿，不静默打开系统浏览器。

- [Bangumi 官方页面实现](https://github.com/bangumi/GraphQL/blob/master/templates/turnstile.liquid)
- [Cloudflare 移动端要求](https://developers.cloudflare.com/turnstile/get-started/mobile-implementation/)
- [Cloudflare 回调与展示配置](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/)
- [React Native WebView 注入时机](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Reference.md#injectedjavascript)

## 构建与测试

新增原生依赖后需重建开发客户端，覆盖安装保留原有数据。仅刷新 Metro 不够。
按 [模拟器指南](ios-simulator.md) 使用指定设备与 `pnpm dev:sim`。

- `tests/inline-turnstile-bridge.test.mjs`：真实桥接脚本在 VM 中验证，覆盖初始化时序、
  回调、来源检查和导航边界。
- `tests/timeline-composer.test.tsx`：真实编辑器和 mutation 搭配模拟 WebView，覆盖
  自动完成、交互展示、取消、迟到回调、重新尝试、超时、账号变化和草稿保留。
- `tests/reply-composer.test.tsx` 和 `tests/topic-composer.test.tsx`：六种评论目标、
  两种话题目标均通过真实 hook/mutation 接入模拟 WebView，验证 token 传递、
  人工交互展示、取消保留草稿和账号切换；编辑回复不挂载验证组件。
- 模拟器需验证真实官方页面和原生 WebView。单元测试不能证明 Cloudflare
  一定自动通过；实际需要交互的频率取决于 Cloudflare 的风险判断。
