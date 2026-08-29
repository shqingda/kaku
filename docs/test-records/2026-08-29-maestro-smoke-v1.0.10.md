# Maestro 冒烟测试记录：v1.0.10 新页面

> 日期：2026-08-29
> 设备：iPhone 17 Pro 模拟器（iOS 26.5），dev client `com.shqingda.kaku.debug` 连 metro
> 工具：Maestro 2.8.0
> flow：`.maestro/kaku-smoke-ios.yaml` → `kaku-smoke-steps.yaml` → `changelog-checks.yaml`
> 结论：**连续两遍通过**（argent-qa-flows 的 two-pass 验收标准），提交 `747c535`

---

## 覆盖路径

```text
首页 → 打开账户菜单 → 账户与设备 → 账户页
  ├─（已登录）更新日志 → 版本徽标断言 + v1.0.9 手风琴展开 → 返回
  ├─（未登录）关于、帮助与隐私 → 更新日志 → 同上 → 返回 ×2
  ├─ scrollUntilVisible 网络诊断 → 三个断言 + 截图 → 返回
  └─ 收尾停在账户页（下次运行由 openLink 复位）
```

登录态分支用视口内元素做 gate：已登录看「更新日志」行，未登录用
`visible: 账户 + notVisible: 更新日志` 双重条件（防止分支返回首页后被误触发）。

## 运行结果

| 遍次 | 结果 | 证据目录 |
| --- | --- | --- |
| Pass 1 | ✅ 通过 | `~/.maestro/tests/2026-08-29_124010 附近 run` |
| Pass 2 | ✅ 通过 | `~/.maestro/tests/2026-08-29_124310` |

断言清单（全部执行）：首页菜单按钮、菜单项「账户与设备」、更新日志标题、
手风琴展开后 v1.0.9 的 Firebase 说明、网络诊断页「本机连通性」与
「重新检测本机连通性」。截图四个：home / changelog / changelog-expanded /
network-status。

## 调试过程中修掉的流程问题（对后续写 flow 有用）

1. **复位策略**：逐层 tap「返回」恢复首页的方案在「首页被滚动到底」时会死
   （首页没有返回按钮）。改为 `openLink` 重载 dev client bundle——路由必然
   回到首页顶部，任何残留状态都能恢复。
2. **reload 竞态**：bundle 重载后布局分阶段挂载，立刻 tap 会用过期坐标点进
   搜索框。tap 前 `waitForAnimationToEnd`，tap 后断言菜单真的打开、失败重试一次。
3. **分支 gate 求值时机**：`runFlow when` 在执行到该步时实时求值。第一个分支
   返回首页后，第二个分支的 `notVisible: 更新日志` 会在首页变成 true 而误触发，
   必须加「仍在账户页」的与条件。

## Maestro + RN 的选择器规则（iOS 实测）

- 容器设了 `accessibilityLabel` 的 Pressable/View，无障碍树只暴露容器，
  内部 Text 不可单独命中 → 断言/点击用容器 label **全文**（精确匹配）。
- `accessibilityState` 会把展开卡片的 `text` 属性变成 `'expanded'`，
  导致该元素 label 匹配失效 → 避免断言处于展开态的卡片。
- 纯 Text（导航标题、章节标题）按自身文本精确匹配。
- `assertVisible` 不支持 `timeout` 属性；长等待用 `extendedWaitUntil`。
  管道里跑 maestro 记得 `set -o pipefail`，否则真实退出码被 tail 吃掉。

## 环境备注

- Android 入口 `kaku-smoke-android.yaml`（appId `com.shqingda.kaku`，无
  `.debug` 后缀）保留备用；本轮按要求未测 Android。
- Xcode 27 已无独立 Simulator.app（改为 DeviceHub），ios-simulator 插件的
  `openSimulator: true` 会报「Unable to find application named 'Simulator'」，
  用 `ios_build_app` + `simctl install/launch` 绕过。
