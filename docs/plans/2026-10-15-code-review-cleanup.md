# 代码审查与清理记录

日期：2026-10-15

目标：删除已退出生产调用链的代码，合并现有规范实现。纯清理保持现有行为；审查发现的推送、图片手势和链路诊断缺陷单独修复、单独提交。

## 决策

- 保留 `usePersonalCollection` 作为个人收藏入口。删除已被替代的本地追番更新器，保留当前表单使用的进度计算。
- 排行榜复用公共缓存工具，但保留其规范化缓存键和依赖注入。
- 收藏校验直接使用 `@kaku/shared` 的状态枚举，不另建抽象。
- 推送返回值在 Expo 接口边界校验。异常响应必须抛错，使通知游标保持原值。
- 保留历史数据库迁移、路由兼容规则、手工诊断入口和仍使用的资源。

## 顺序与验证

| 步骤 | 范围 | 验收 | 验证 |
| --- | --- | --- | --- |
| 1 | 旧追番状态流 | 生产不依赖被删函数；保留现用进度函数和测试 | `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test apps/mobile/tests/domain.test.mjs` |
| 2 | API 缓存与枚举 | 命中头、缓存键、输入校验保持行为 | `node --test apps/api/tests/rankings.test.mjs apps/api/tests/collections-routes.test.mjs` |
| 3 | Expo 推送边界 | 畸形/缺项响应失败，游标不推进；正常与无效设备行为保留 | `node --test apps/api/tests/push.test.mjs` |
| 4 | 无引用残留 | 删除示例、翻译字段、CSS 变量和 shell 辅助函数 | 引用核实、diff 检查、`bash -n scripts/check-upstream.sh` |
| 5 | 图片预览手势 | 放大图支持横向平移；减少动态效果不禁用缩放；取消手势不关闭 | `pnpm --filter @kaku/mobile exec jest tests/fullscreen-image-viewer.test.tsx --runInBand` |
| 6 | 链路诊断 | 直连忽略代理，显式代理不受 NO_PROXY 干扰 | `node --test scripts/check-upstream.test.mjs`（stub curl/dig，不访问网络） |

每组测试修改后仅运行一次。失败时最多两次修复重测；不运行全量测试、E2E、构建或模拟器验收。纯样式、静态字段和文档改动不运行测试。

## 风险

- 只删除测试引用的函数，需要同时确认生产引用和历史替代链，不能仅凭搜索次数判断。
- 保留当前界面与原生导航。图片手势定向测试不能证明设备手感、VoiceOver 或大字布局已通过验收。
- 推送网络超时仍可能发生“服务已接收但调用方未知”。本次只修复畸形响应被误判成功，不承诺投递恰好一次。

## 执行状态

- [x] 删除旧追番状态流并运行 `domain.test.mjs`：9 项通过。
- [x] 复用 API 缓存工具及收藏枚举并运行两个定向测试文件：21 项通过。
- [x] 校验 Expo 推送返回值并运行 `push.test.mjs`：32 项通过。
- [x] 删除已证明无引用的文件与声明；完成引用、diff 和 shell 语法检查。
- [x] 修复图片预览手势与减少动态效果，运行 `fullscreen-image-viewer.test.tsx`：最终 9 项通过。
- [x] 修复直连代理隔离，运行 stub 诊断测试：1 项通过；未访问网络。
- [x] 复核全部 diff，记录验证边界，按逻辑提交；不推送。

## 审查依据

- 旧追番状态流在历史提交 `ccd75d4` 中被个人收藏链路替代。删除的 6 个函数只剩旧测试调用；现用的 `canRateCollectionStatus` 和 `resizeWatchedEpisodes` 保留。
- 排行榜的响应缓存辅助函数与 `public-cache.ts` 完全相同。收藏状态元组的值及顺序也与共享定义相同。
- `hello-world.js` 无脚本、CI 或源码入口。`langLabel` 和两个 CSS 变量只有定义，没有消费端。
- 推送校验遵循 [Expo ticket 协议](https://docs.expo.dev/push-notifications/sending-notifications/#push-tickets)。数组请求应返回同顺序 ticket，成功项带 `id`。异常结果不能当成发送成功。
- 诊断回归实际执行 shell 脚本，使用本地 stub 捕获 5 次 `curl` 参数，覆盖大小写代理变量及 `NO_PROXY='*'`。这只证明参数正确，不证明网络可达。
- 图片预览的纵向激活门槛阻止了放大后的横移；减少动态效果还同时禁用了缩放。现保留直接操作，只减少自动动画；重新抓取从展示值开始，取消时归位。缩放回弹被拖动打断后，松手将比例及平移收回合法范围。

## 验证结果

| 定向范围 | 最终结果 |
| --- | --- |
| `apps/mobile/tests/domain.test.mjs` | 9 通过 |
| `apps/api/tests/rankings.test.mjs`、`collections-routes.test.mjs` | 21 通过 |
| `apps/api/tests/push.test.mjs` | 32 通过，含 18 种畸形响应场景 |
| `scripts/check-upstream.test.mjs` | 1 通过 |
| `apps/mobile/tests/fullscreen-image-viewer.test.tsx` | 9 通过 |
| 改动入口及其依赖的 TypeScript 检查 | API、移动端均通过 |
| shell 语法、diff 空白检查 | 通过 |
| 官网 Impeccable 静态检测 | `[]` |

最终共 72 项测试通过。前四组各运行一次。图片组件首轮 4 通过、3 失败，原因是窗口尺寸替身和动画 spy 的安装时机；第 1 轮修正后 7 项通过。独立复核随后发现新增的缩放动画中断问题，定向类型检查发现新测试替身的类型错误；第 2 轮合并修正后，类型检查及 9 项测试全部通过。没有删除或弱化失败断言。

## 验证边界

- API 和移动端修改通过仅列改动入口及必要环境声明的临时 TypeScript 配置检查；临时配置已删除。没有运行全 workspace 类型检查。
- 官网只删除未使用声明。Impeccable 静态检测返回 `[]`；未改布局或显示文案。
- 独立代理已交叉复核旧代码删除、缓存/枚举复用、推送校验、图片手势及 shell/官网清理。发现的阻塞问题已修复并复核通过。
- 未运行全量测试、mutation、构建、真实推送或真实网络诊断。测试只在对应代码发生修改后运行，图片组件共使用两轮修正重测。
- 未启动模拟器或操作已有用户数据。原生手势识别、设备手感、VoiceOver 和大字布局仍需设备验收，继续由 [当前待办](../../TODO.md) 跟踪。
