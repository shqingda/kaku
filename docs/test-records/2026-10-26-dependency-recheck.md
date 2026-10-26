# 依赖安全复核（2026-10-26）

接续 [2026-10-24 安全修复](2026-10-24-dependency-security.md) 记录的两项跟进。

## node-forge：仍无官方修复，保留本地补丁

- npm 最新版本仍为 1.4.0（2026-03-24 发布），GHSA-86w9-cpqp-85rv 影响 `<=1.4.0`。
- 上游候选修复 [#1152](https://github.com/digitalbazaar/forge/pull/1152) 仍为 OPEN，未合并。
- 保留 `patches/node-forge@1.4.0.patch` 及回归测试。原始审计的 1 high 即此版本匹配结果。
- 下一次复核点沿用 2026-10-31；官方发布后升级、移除补丁、保留测试并重跑未过滤审计。

## drizzle-kit 间接 esbuild：已用定向 override 消除

- 公告 GHSA-67mh-4wv8-2f99（esbuild 开发服务器跨域读取，`<=0.24.2`）。
- 唯一命中路径：`drizzle-kit@0.31.11 > @esbuild-kit/esm-loader > @esbuild-kit/core-utils@3.3.2 > esbuild@0.18.20`。
- drizzle-kit 0.31.11 最新稳定版仍声明该依赖；检查其全部入口（bin.cjs、api、index、utils）
  均未引用 `@esbuild-kit`，即声明但不加载。core-utils 本身只调用 `transform` /
  `transformSync`，不使用受影响的 serve。
- 处理：`pnpm-workspace.yaml` 中只对 `@esbuild-kit/core-utils>esbuild` 覆盖为 0.25.12，
  该版本已是 drizzle-kit 直接依赖的副本，不新增包；锁文件只移除 0.18.20 及其平台包。
  未添加 audit ignore。

## 验证

| 检查 | 结果 |
| --- | --- |
| 原始 `pnpm audit` | 1 high（node-forge，见上）/ 0 moderate |
| `drizzle-kit generate`（apps/api） | 正常运行，“No schema changes” |
| API 单元测试 | 389 项通过 |

未运行移动端构建：本次改动只涉及 API 开发工具依赖链。
