# Kaku 测试指南

纯逻辑和 API 集成测试保护数据与服务行为，组件测试保护渲染与交互。
Maestro 仅保留核心导航 E2E 和按需原生缺陷专项；其余设备体验人工验收。
日常小改动运行关联检查，阶段收尾、构建前运行完整预检，不默认串行跑全部设备流程。

CI（`.github/workflows/ci.yml`）在 `main` 和 PR 上跑：Expo 依赖检查、
expo-doctor、全 workspace 类型检查、shared 单元测试、API 75% / 移动端 92%
行覆盖、构建/测量脚本检查、jest 组件测试、iOS/Android JS bundle、官网构建。
API 与移动端的覆盖率命令已经运行各自的完整单元测试；HTML 解析回归包含在 API 测试中，
完整检查只执行每组测试一次。
Maestro 和 argent **不进 CI**。

## 本地 CI 预检

构建、预构建和发版前，在仓库根目录执行：

```bash
pnpm ci:check
# 全部通过后，再按需要构建 Android 安装包
pnpm build:android
```

`ci:check` 与 GitHub CI 共用 `scripts/ci-check.sh`，先以 frozen lockfile 安装依赖，
再检查 Expo 依赖与项目诊断、全仓类型、shared 单元测试、工具脚本、API 75% / 移动端 92%
行覆盖（含各自完整单元测试）、移动端组件、iOS / Android JS bundle 和官网构建。
任一步失败立即停止，显示失败命令并返回非零退出码；修复后重跑。
需要联网下载缺失依赖及运行 Expo 诊断，前置环境为仓库要求的 Node / pnpm 与 Python 3。

GitHub 的 `verify` 任务调用 `pnpm ci:check verify`；本地默认不传参数或传 `all`，
均运行同一套完整检查。只需检查 HTML 解析时，可用 `pnpm ci:check html` 安装依赖并运行专项，
或在已有依赖的工作区直接运行 `pnpm --filter @kaku/api test:html-parsers`。
JS bundle 写入临时目录并在退出时清理，官网仍输出到自己的忽略目录。
此命令不打原生安装包、不上传、不发布、不操作模拟器或实机，也不覆盖已有 APK。
通过表示这些检查在当前机器通过，不代表 Linux CI、原生编译或实机验证必然通过。
`build:android` 保留纯构建职责，不隐式重复预检。

## Android 实机测试约定

自 2026-10-28 起，日常 Android 实机测试、问题复现和改动验证默认使用本地编译的 release APK，以节省 GitHub Actions 构建用量：

1. 在仓库根目录先运行 `pnpm ci:check`，通过后运行 `pnpm build:android`，构建方法与签名要求见[构建与发版指南](../deployment/release.md)。
2. 构建成功后，将 APK 交给用户，或提供实际产物的绝对路径；默认产物为 `apps/mobile/dist-split/kaku-release.apk`。同时说明对应版本、改动和待验证项目。
3. 等用户安装完成后再开展实机验证。构建与签名检查通过不等于实机测试通过；尚未安装或未完成的验证应明确记为待验。

只有用户明确确定要发版时，才运行 GitHub Actions 的 Android 构建（包括 `build_only`）。普通的“测试一下”“验证一下”不代表发版授权；本地构建失败时先排查并报告阻塞，不自动转用 CI 构建。此约定针对 Android 安装包构建，现有常规 CI 质量检查保持原有规则。

## 1. 纯逻辑单元测试（node:test）

- 位置：`apps/mobile/tests/*.test.mjs`（以及 `apps/api/tests/*.test.mjs`、
  `packages/shared/tests/`）。直接 import TS 源码，依赖 Node 26.12.1 的原生
  类型剥离，因此**被测模块的整条导入链不能引 react / react-native / expo**。
- 运行：`pnpm test`（全部 workspace）。
- 覆盖率门禁：`pnpm --filter @kaku/mobile test:coverage`（92% 行），
  `pnpm --filter @kaku/api test:coverage`（75% 行），CI 强制。

## 2. 组件 / Hook 测试（jest-expo + React Native Testing Library）

- 位置：`apps/mobile/tests/*.test.ts` 和 `*.test.tsx`；全局 stub 见
  `apps/mobile/tests/ui/setup.ts`（偏好上下文与触觉）。
  RNTL v14 的 `render` 是 async，必须 `await`。
- 运行：`pnpm --filter @kaku/mobile test:ui`（根目录也有 `pnpm test:ui`），
  CI 强制。
- 与 node:test 的分工：`.test.ts` / `.test.tsx` 归 jest，`.test.mjs` 归 node:test，
  两个 testMatch 互不重叠。

## 3. 精简设备 E2E（按需，不进 CI）

只保留两类行为，同一设备串行运行，验收期间停止源码编辑、依赖安装和 prebuild：

| 命令 | 何时运行 / 保护什么 |
| --- | --- |
| `pnpm test:e2e ios` | 核心导航或原生升级后：启动 → 搜索 → 详情 → 返回；复用指定模拟器 |
| `pnpm test:e2e android <设备序列号>` | 用户安装本地 release APK 后，同一条核心链路；不自动选择设备 |
| `pnpm test:e2e reply` | 回复弹层、导航或无障碍实现变更时：已登录 iOS 连续关闭重开，检查输入框/发送按钮可访问、背景隔离；不输入、发送或清除草稿 |

不保留全量入口、逐页标题冒烟、更新日志/主题/商店截图/旧性能导航脚本或游客清历史流程。
更新日志与主题状态由组件测试保护；设备外观、原生键盘及手势按下表人工检查。
核心搜索可能正常产生浏览/搜索历史；不会为了复位删除它们。中文粘贴不算输入法组合输入验收。

### 项目内安装与输出

只通过 `pnpm test:e2e` 调用项目 CLI，不使用全局安装或修改 shell PATH。
固定 Maestro 2.12.0，官方 ZIP SHA-256 为
`a6044a84542f522f434c5dc3d609e60c7446d423f3ed1b2ae513f5c48663ec5e`。
在仓库根目录下载并核验后解压（需要已有 Java；不自动安装系统工具）：

```sh
mkdir -p .cache/maestro/downloads .cache/maestro/cli
curl -fL -o .cache/maestro/downloads/maestro.zip https://github.com/mobile-dev-inc/Maestro/releases/download/cli-2.12.0/maestro.zip
python3 -c 'import hashlib,pathlib; p=pathlib.Path(".cache/maestro/downloads/maestro.zip"); assert hashlib.sha256(p.read_bytes()).hexdigest()=="a6044a84542f522f434c5dc3d609e60c7446d423f3ed1b2ae513f5c48663ec5e"'
unzip -q .cache/maestro/downloads/maestro.zip -d .cache/maestro/cli
pnpm test:e2e check
```

`check` 使用 CLI 检查三个入口及引用流程的语法，不操作设备，不表示 E2E 通过。
安装、XDG 状态、Java home 回退、临时文件和报告都集中于被 Git 忽略的 `.cache/maestro/`；
报告位于 `results/<ios|android|reply>/`。实跑中 Maestro 仍会为同名流程创建 `-2` 等编号子目录，并为 XCTest 日志加时间戳；它们全部留在该项目目录内。禁用 Maestro 使用统计，不使用 Cloud 上传。
这不是系统沙箱：Java、Xcode、Android SDK、系统诊断和设备侧测试驱动仍由系统管理，
不能保证操作系统完全不产生项目外缓存。不会改写 HOME、清理用户主目录或迁移旧截图。
测试及相关进程完全停止后，可删除项目 `.cache/maestro/`，但会同时删除 CLI，下次须重新安装。日常只清理 `results/` 和 `tmp/` 即可保留 CLI；需要的截图/日志先留存。不要在运行中删除，也不要把这个目录当作模拟器应用数据目录。
配置依据：[CLI 参数](https://github.com/mobile-dev-inc/maestro-docs/blob/main/maestro-cli/maestro-cli-commands-and-options.md)、
[Maestro 状态目录实现](https://github.com/mobile-dev-inc/Maestro/blob/cli-2.12.0/maestro-cli/src/main/java/maestro/cli/util/EnvUtils.kt)。

### 设备前置与简短验收清单

- iOS 先列设备，仅复用 `A395E274-D899-42DA-BE4C-416A9F89F671`（iPhone 18 Pro / iOS 27.0）；
  用 `pnpm dev:sim` 启动，保留 PosterBoard 停用、登录、钥匙串、历史和草稿，不卸载/抹除/退出。
  鉴权专项前提醒用户本人重新登录；不满足当前登录态的场景跳过并记录。启动步骤见 [模拟器指南](ios-simulator.md)。
- Android 按上文先交付本地 release APK，等用户安装，再显式选择设备；不触发 Android CI。
- 只检查与改动有关的项目，不要求每次全部执行：

| 改动 | 最小设备检查 |
| --- | --- |
| 导航、原生升级 | 核心 E2E；打开与返回、冷启动是否正常 |
| 编辑器/弹层 | 键盘遮挡、中文组合输入、关闭重开、已有草稿保留；不擅自发送或丢弃 |
| 列表/网络 | 首次离线提示、旧内容保留、恢复后刷新与翻页重试 |
| 图片/动效 | 缩放与关闭、回弹中接管、反向拖动、减少动态效果 |
| 排版/外观/无障碍 | 小屏大字号、深浅色、真实读屏；记录并恢复原设置 |
| 账号/安装/推送 | 按 TODO 和可用账号/设备验收登录、覆盖安装数据保留、通知送达；缺条件明确待验 |

只记录设备、构建提交、实际检查、结果及跳过项。原生行为不能由组件模拟替代。

### 性能复测

诊断页分别显示 JS 首布局、缓存恢复和首页首个有意义结果（内容/空态/错误/游客），不包含原生进程启动时间。指定模拟器已有 [2026-10-26 Release 三轮基线](../test-records/2026-10-26-p1-baseline-release.md)，同设备、系统、构建模式和流程下才作比较；这些条件改变时重新采集三轮。可靠测量不可用的路径保留待验，不复用旧设备数字推断收益。

工作区大小只读盘点：`node scripts/report-workspace-files.mjs`。输出逻辑字节而非可释放空间；固定白名单且不接受删除参数，排除 tutorial、签名/env、安装包和模拟器数据。

性能路径由验收者按当次测量目标操作并记录，不再维护旧自动导航脚本。历史基线保留，不能混用不同路径的样本。

构建与测量脚本运行 `pnpm test:tooling`，覆盖纯构建的发布副作用隔离、APK 分类统计和性能阈值。
性能工具支持 `node scripts/check-performance.mjs report.json baseline.json`；省略第二个参数时读取 2026-10-26 Release 冷启动基线（`scripts/baselines/ios-2026-10-26-release.json`，诊断页三项 JS 计时）；旧的 2026-09-04 profiler 基线保留作历史对照。基线必须包含 device、os、mode、flow、budgetRatio 和 metrics（各指标毫秒值）；报告中的每个指标需要三轮正数采样。同环境才比较，首页数据只能来自实际采集，不能补写推测值。

## 4. UI 交互验收（argent 会话）

argent 是 agent 驱动的模拟器交互：起模拟器、装 debug 构建、按真实用户
路径走查（动效手感、骨架屏、离线文案、无障碍）。操作手册见
`docs/development/argent-usage.md`。结果按 `docs/test-records/` 的既有格式归档。
OAuth 登录、真实写入等需要人工参与的场景也记在那里。

Argent 0.24 在部分页面会出现「树读得到、手势送不进去」。这时按 [模拟器指南](ios-simulator.md) 检查输入，不要对着同一坐标连点。
