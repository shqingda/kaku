# 依赖补丁升级与安全修复

## 范围

- TanStack Query 三件套 5.104.2 → 5.104.5。
- React Native Testing Library 14.0.1 → 14.1.0；test-renderer 1.3.0 → 1.3.1。
- Vite 8.3.4 → 8.3.5。
- Expo、React、React Native、Wrangler、Drizzle 等其他直接依赖保持不变。

## 安全修复

开发服务器、构建输入、图像转换和签名校验是本次涉及的信任边界。
审计依赖路径不等于生产应用实际执行路径；本次仍处理开发工具中的漏洞。

在既有版本范围内刷新 shell-quote 1.12.0、compression 1.8.2、
fast-uri 3.1.9、js-yaml 4.3.2、brace-expansion 1.1.21 / 5.0.12、
@xmldom/xmldom 0.8.15 / 0.9.12。旧主版本中未命中公告的副本保留。

两个范围明确的 override：

- Sharp 0.35.x 固定到 0.35.5，替换 Miniflare 固定的易受影响版本及其 libvips。
- 仅 @expo/cli@58.1.15 的 Zod 改用 4.6.7。检查了 CLI 的两个 Zod 导入模块；
  新增测试覆盖插件结构、输出格式、动态命令 schema、错误类型和未知字段拒绝。
  这是经过针对性验证的跨主版本替换，不是全局 Zod override。

未增加 audit ignore、放宽构建脚本允许列表或改写包版本掩盖公告。
锁文件由 pnpm 12.14.0 生成，检查了新增/移除包及同版本 integrity。

## node-forge：漏洞已加本地补丁，原始审计仍报 high

[GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
影响当前最新 node-forge 1.4.0；截至 2026-10-24 尚无官方修复发布。
采用[上游候选修复 #1152](https://github.com/digitalbazaar/forge/pull/1152)
的核心嵌套元素数量校验，保存为 pnpm patch；该 PR 尚未合并。
补丁不改变版本号，完整保留正常签名验证功能。

新增回归测试构造含额外 DigestAlgorithm 子元素的签名：补丁前测试失败，
补丁后拒绝该结构，同时接受正常 SHA-256 签名。该测试验证解析缺口，
并非声称重新演示了无需私钥的完整签名伪造攻击。

原始 `pnpm audit --json`：

| 严重性 | 修复前 | 修复后 |
| --- | --- | --- |
| critical | 1 | 0 |
| high | 34 | 1 |
| moderate | 10 | 1 |
| low | 2 | 0 |

剩余 high 是 node-forge 的版本匹配结果，pnpm audit 不理解源码补丁。
因此不能宣称“原始审计 high 已清零”。剩余 moderate 是 drizzle-kit
间接依赖的旧 esbuild；未在本次跨主版本替换。

后续复查日期：2026-10-31（记录日期，不代表已创建自动提醒）。官方发布修复后，
升级并移除 node-forge patch，保留回归测试，重新运行未过滤的原始审计。

## 验证

- workspace 类型检查通过。
- 单元测试：Shared 6、Mobile 390、API 380 项通过。
- UI 测试：63 套件、375 项通过。
- 工具测试：23 项 Node（含新增 2 项）、2 项 Python 通过。
- Expo install --check 通过；既有 TypeScript/FlashList 排除项未改。
- Expo prebuild 配置解析、iOS/Android JS 导出、官网生产构建通过。
- 冻结锁文件安装通过（复用本机缓存，关闭安装脚本）。
- 既有 expo-quick-actions 工具链对 TypeScript 5 的 peer 警告仍在。

未执行原生重建、设备冒烟或真实 Sentry 上报；本次没有升级应用原生模块。
日志位于本机 `/tmp/kaku-security-*`，不提交生成物或环境配置。
