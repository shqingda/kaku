# Expo CI 兼容性修复（2026-10-16）

## 问题与最小升级范围

原 CI 在 `expo install --check` 报告五个 Expo SDK 57 包版本不匹配，本地用同一命令复现失败。按 Expo 官方升级流程核对目标版本和变更说明后，只升级这组相互关联的补丁版本，不跨 SDK。

| 直接依赖 | 原版本 | 本次版本 |
| --- | --- | --- |
| expo | 57.0.28 | 57.0.30 |
| expo-constants | 57.0.21 | 57.0.22 |
| expo-linking | 57.0.12 | 57.0.13 |
| expo-notifications | 57.0.22 | 57.0.23 |
| expo-router | 57.0.26 | 57.0.28 |

`expo@57.0.30` 发布包的 `bundledNativeModules.json` 与上述配套版本一致。继续使用原有 `~` 范围，锁文件固定实际版本。

锁文件使用与 CI 相同的 pnpm 11（本地解析为 11.28.5）生成，没有手工编辑。对比 `packages` 节点，仅有上表五项和下表九项版本替换；其他包的版本及完整性元数据未变。其余差异为 Expo peer 上下文、哈希及 pnpm 重新生成的 Metro peer 元数据。

| 间接依赖 | 原版本 | 本次版本 |
| --- | --- | --- |
| @expo/cli | 57.0.29 | 57.0.31 |
| @expo/metro-runtime | 57.0.16 | 57.0.17 |
| @expo/prebuild-config | 57.0.18 | 57.0.19 |
| @expo/router-server | 57.0.12 | 57.0.13 |
| @expo/ui | 57.0.23 | 57.0.25 |
| babel-preset-expo | 57.0.15 | 57.0.16 |
| expo-asset | 57.0.19 | 57.0.20 |
| expo-modules-autolinking | 57.0.15 | 57.0.16 |
| expo-modules-core | 57.0.22 | 57.0.23 |

## 升级要求核对

依据 [Expo SDK 升级流程](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/) 和 [Expo CLI install 检查说明](https://docs.expo.dev/more/expo-cli/#install)，核对发布包的版本映射，并运行兼容性检查、Doctor 和项目回归。

变更说明固定在目标发布包 `gitHead` 对应的 Expo 提交 `396da4641605bb19c1e6b3efff1cafaab8890a29`，避免后续主分支变更影响证据：

- [Expo](https://github.com/expo/expo/blob/396da4641605bb19c1e6b3efff1cafaab8890a29/packages/expo/CHANGELOG.md)、[Constants](https://github.com/expo/expo/blob/396da4641605bb19c1e6b3efff1cafaab8890a29/packages/expo-constants/CHANGELOG.md)、[Linking](https://github.com/expo/expo/blob/396da4641605bb19c1e6b3efff1cafaab8890a29/packages/expo-linking/CHANGELOG.md)、[Router](https://github.com/expo/expo/blob/396da4641605bb19c1e6b3efff1cafaab8890a29/packages/expo-router/CHANGELOG.md)：本次跨过的补丁均未列出面向用户的变更。
- [Notifications](https://github.com/expo/expo/blob/396da4641605bb19c1e6b3efff1cafaab8890a29/packages/expo-notifications/CHANGELOG.md)：修复 Android Expo Go 中导入模块时的崩溃。
- [CLI](https://github.com/expo/expo/blob/396da4641605bb19c1e6b3efff1cafaab8890a29/packages/%40expo/cli/CHANGELOG.md)：提高 Atlas 最低版本要求；[UI](https://github.com/expo/expo/blob/396da4641605bb19c1e6b3efff1cafaab8890a29/packages/expo-ui/CHANGELOG.md)：包含 Android 下拉菜单定位、ListItem testID 和 TextInput 占位文字样式修复。
- [Autolinking](https://github.com/expo/expo/blob/396da4641605bb19c1e6b3efff1cafaab8890a29/packages/expo-modules-autolinking/CHANGELOG.md)：使重复原生模块的选择与指纹计算保持确定性；[Modules Core](https://github.com/expo/expo/blob/396da4641605bb19c1e6b3efff1cafaab8890a29/packages/expo-modules-core/CHANGELOG.md)：修复 iOS SwiftUI InputAccessoryView 崩溃。
- Metro Runtime、Prebuild Config、Router Server、Babel Preset 和 Asset 的本次补丁未列出面向用户的变更。没有需要修改业务代码的迁移步骤。

## 发布等待期与冻结安装

pnpm 11 默认启用 24 小时依赖发布等待期，属于安装策略；见 [pnpm 依赖解析设置](https://pnpm.io/settings/dependency-resolution)。最初使用已有缓存的冻结安装通过，但用独立空元数据缓存复核时，锁文件中六个新发布版本被拒绝。因此不把缓存命中的结果当作冷安装证据。

用户随后明确要求跳过本次等待，已在现有 `minimumReleaseAgeExclude` 列表中追加六个精确版本：

```text
@expo/cli@57.0.31
@expo/router-server@57.0.13
@expo/ui@57.0.25
babel-preset-expo@57.0.16
expo-router@57.0.28
expo@57.0.30
```

没有添加包名通配例外，也没有关闭全局等待期。带例外重新运行实际工作区的冻结安装，并指定新的空元数据缓存：

```sh
CI=1 pnpm dlx pnpm@11 install --frozen-lockfile \
  --cache-dir /tmp/kaku-expo-upgrade/authorized-cold-cache
```

结果：`Lockfile passes supply-chain policies (1109 entries in 8.8s)`，退出码 0。该缓存目录在此次运行前不存在；包内容复用本机存储，策略检查不复用旧的元数据验证缓存。

## 自动化验证

本地环境：Node 26.12.0、pnpm 11.28.5（冻结安装／锁文件），Expo Doctor 1.21.4。以下检查均通过：

| 检查 | 结果 |
| --- | --- |
| `CI=1 pnpm --filter @kaku/mobile exec expo install --check` | Dependencies are up to date |
| `pnpm dlx expo-doctor`（apps/mobile） | 21 / 21 |
| `pnpm typecheck` | 全工作区通过 |
| Shared 测试 | 3 项通过 |
| API `test:coverage` | 329 项通过；行覆盖率 93.38%，门槛 75% |
| Mobile `test:coverage` | 370 项通过；行覆盖率 94.60%，门槛 92% |
| Mobile `test:ui --runInBand --watchman=false` | 59 个套件、316 项通过 |
| `pnpm test:tooling` | 18 项 Node 测试、2 项 Python 测试通过 |
| `expo export --platform ios` | 成功，产物保存在仓库外 |
| `expo export --platform android` | 成功，产物保存在仓库外 |
| `pnpm build:web` | 成功 |

UI 测试的 `--watchman=false` 仅避开本机 Watchman 停滞，CI 命令未改。`.github/workflows/ci.yml`、覆盖率阈值、测试及原有 Expo 检查排除项均未修改。远端执行结果以本次推送对应的 [GitHub Actions CI](https://github.com/shqingda/kaku/actions/workflows/ci.yml) 运行为准；此表记录本地验证。

同一次 npm registry 审计中，升级前后的漏洞报告相同：3 low、20 moderate、38 high、1 critical，公告 ID 无新增或移除，本次变更的 14 个包无直接命中。既有依赖审计事项未在此次兼容性修复中扩大升级范围，也未通过增加忽略项隐藏。

## 验证边界

本轮解决依赖一致性和 CI 检查失败，没有构建或发布新的原生安装包。JavaScript 打包通过不代表新原生模块已经完成设备验收；后续正式构建仍需正常的原生构建与设备回归。本轮未重装模拟器应用、退出账号或清理账号、草稿及历史数据。
