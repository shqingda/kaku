# 构建与发版指南

先选构建入口，再决定是否发布。源码版本以 [Expo 配置](../../apps/mobile/app.config.js) 为准，已发布产物以 [GitHub Releases](https://github.com/shqingda/kaku/releases) 为准。当前 GitHub 版本 v1.1.17 为 42.13 MB 裁剪包，构建、签名及上传核验见 [发布记录](../test-records/2026-10-03-sheet-interaction.md)。本地正式包、EAS production 和 GitHub APK 均默认启用 R8 与资源裁剪；调试包保持关闭。此前 v1.1.15 同版本安装包替换见 [历史记录](../test-records/2026-10-03-release-1.1.15.md)，早期裁剪对比见 [2026-10-02 记录](../test-records/2026-10-02-project-optimization.md)。Android 实机兼容性仍待验。

## 纯本地构建

前置：Node / pnpm、Android SDK（`ANDROID_HOME`）、JDK 17、Python 3。原生目录由 Expo prebuild 生成，不入库。若要保留运行时崩溃上报，在 `apps/mobile/.env` 配置 `EXPO_PUBLIC_SENTRY_DSN`；纯构建不要求 GitHub 登录或发版说明。

```bash
# 默认 GitHub 渠道、正式包名，单一 arm64-v8a APK，启用 R8 与资源裁剪
pnpm build:android
# 使用 debug 包名和图标；仍是可独立运行的 Release 构建，不依赖 Metro
bash scripts/build-android.sh debug
# 显式关闭裁剪，生成独立诊断对照包
bash scripts/build-android.sh release --no-optimize
# 兼容旧入口：与默认 release 配置相同，保留 -optimized 文件名
bash scripts/build-android.sh release --optimized
# 兼容旧入口：省略 tag 时自动使用当前 app 版本
bash scripts/build-split-apks.sh --build-only
```

| 渠道 | 包名 | `apps/mobile/dist-split/` 产物 |
| --- | --- | --- |
| release（默认裁剪） | `com.shqingda.kaku` | `kaku-release.apk` |
| debug | `com.shqingda.kaku.debug` | `kaku-debug.apk` |
| release + `--optimized` | `com.shqingda.kaku` | `kaku-release-optimized.apk` |
| release + `--no-optimize` | `com.shqingda.kaku` | `kaku-release-unoptimized.apk` |

纯构建只生成原生工程、打包和报告体积，不改受版本控制的文件、不更新日志、不提交、不推送、不创建 Release，也不清空其他候选产物。使用 `SENTRY_DISABLE_AUTO_UPLOAD=true` 禁止本地上传 source map，运行时 Sentry 保留。`expo run:android` / `expo run:ios` 则是日常开发客户端入口。

### 测量与裁剪

先保存相同工具版本、ABI、签名、渠道的非裁剪对照包，再构建默认裁剪包。比较源码范围也要记录，不能把依赖升级或不同 ABI 当作优化收益。

```bash
bash scripts/build-android.sh release --no-optimize
bash scripts/build-android.sh release
python3 scripts/report-apk-size.py apps/mobile/dist-split/kaku-release.apk --baseline apps/mobile/dist-split/kaku-release-unoptimized.apk
# 添加 --json 得到 SHA-256、分类字节数和变化比例
```

报告按 ZIP 压缩后大小分类为原生库、DEX、JS、资源和其他，单列 ZIP/签名/对齐开销；它不是安装后的磁盘占用。仓库资产清理另记，不合并到 APK 收益。

正式包通过 Expo 配置源默认打开 `enableMinifyInReleaseBuilds` 与 `enableShrinkResourcesInReleaseBuilds`；两项配置的用途见 [Expo 构建配置](https://docs.expo.dev/versions/latest/sdk/build-properties/)。本地发布入口默认上传裁剪后的 `kaku-release.apk`；纯构建显式传入 `--no-optimize` 才关闭，并使用独立文件名。脚本按参数确定开关，旧 shell 或 `.env` 中的 `KAKU_OPTIMIZE_NATIVE=0` 不会悄悄关闭默认裁剪。EAS `production` 显式设为 `1`，`github` 继承；直接调用 Expo 配置时可用 `KAKU_OPTIMIZE_NATIVE=0` 生成诊断配置。

v1.1.14 是早期裁剪包，v1.1.15 首次发布未裁剪，后按用户要求替换为裁剪包；原产物与替换产物的摘要分别保留在发布记录中。Android 运行验收仍待完成。直接使用忽略的 `android/` 工程会沿用上次生成的设置，下一次应从纯构建入口重新生成所需配置。

## 本地构建并发布 GitHub Release

这是会提交日志、推送并发布的显式入口。执行前需要用户明确授权推送/发版、`gh` 登录和正确的发布分支。

1. 修改 Expo 配置的版本，编写 `scripts/release-notes.md`，检查完整差异并通过回归。
2. 卸载代理环境变量，运行发布入口：

```bash
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY
bash scripts/build-split-apks.sh                 # tag 自动取 v<app 版本>
# 或省略 tag 并显式指定包名渠道
bash scripts/build-split-apks.sh "" release
```

脚本先同步 App 内更新日志（已有版本不覆盖手改内容，缺失时写入并提交），再调用纯构建，执行 `git push origin HEAD:main`，最后创建 GitHub Release 并上传 APK。发版说明中的安装提示不会收入 App 内更新日志。

- 本地包使用 debug 签名，保持现有方式；同包名、同签名可以覆盖，不同签名不能直接覆盖。不要把 EAS keystore 与本地 debug 证书当成同一签名。
- 只构建 arm64-v8a，不支持 32 位机和 x86 模拟器；ABI 参数是 `-PreactNativeArchitectures=arm64-v8a`。
- 本地不上传 source map，压缩堆栈定位能力受限。
- 构建完成只证明可编译，发布前仍要核对签名、版本、权限并完成设备安装/运行验收。

## EAS 云端构建

[eas.json](../../apps/mobile/eas.json) 分开维护三种用途。云端额度和凭据状态需要在实际使用时查询，尚未实跑这套云端构建与发布流程；已发布的 v1.1.13 / v1.1.14 / v1.1.15 来自本地构建。

| Profile | 用途 | Android 产物 |
| --- | --- | --- |
| `development` | 开发客户端、Metro | 内部分发开发包，debug 包名 |
| `production` | Play / App Store 正式构建 | AAB，正式包名，启用 R8 与资源裁剪 |
| `github` | GitHub 安装包 | APK，正式包名，继承 production 签名及裁剪配置；启用 GitHub 更新权限 |

EAS 默认 Android 产物为 AAB；直接安装需显式 `android.buildType: apk`，见 [Expo APK 指南](https://docs.expo.dev/build-reference/apk/)。不能只把 AAB 改名为 `.apk`。

```bash
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY
pnpm --filter @kaku/mobile build:dev
pnpm --filter @kaku/mobile build:production
pnpm --filter @kaku/mobile build:list
# 仅构建 GitHub APK，不发布：
cd apps/mobile
pnpm dlx eas-cli@22.2.0 build --platform android --profile github
```

旧 `build:preview` 指向不存在的 profile，已移除；查询构建记录统一用 `build:list`。

云端发布从 [Release Android APK workflow](../../.github/workflows/release-apk.yml) 手动触发，需要仓库 Secret `EXPO_TOKEN`。选择 `github`，tag 留空使用当前 `v<app 版本>`，显式 tag 必须匹配版本。流程构建、轮询、下载后检查 APK 结构，才创建 Release；标题也从当前版本生成。此流程同样需要明确的发布授权。

EAS `production` 开启 `autoIncrement`，版本构建号由远端管理；本地构建号显式维护在 `app.config.js` 的 `android.versionCode`，每次发新版递增。v1.1.16 从历史值 1 递增为 2，v1.1.17 递增为 3。包名与签名保持现有渠道约定，构建与签名核对见验收记录。

Play 上架使用 `production` AAB 和正式签名，不能上传本地 debug 签名 APK。商店账号、提交凭据与设备验收仍是独立后续工作；素材见 [商店清单](../store/listing.md)。Sentry source map 上传还依赖 EAS 环境中的 DSN、组织和认证配置，不能仅凭构建 profile 宣称已经可用。

## 应用内检查更新

账户 → 设置与本地 → 点击“检查更新”直接检查，右侧显示加载转圈，不跳转页面。手动检查无新版提示“已是最新版”，有新版直接询问是否下载；自动检查无新版或失败均不弹框。正式客户端启动或回到前台时自动检查，最多每 24 小时一次。同一版本自动提醒后 7 天内不再提示；新版本可再次提示。检查失败也遵守自动冷却，手动重试不受限制。开发模式不自动弹更新提醒。

- `scripts/build-split-apks.sh` 为本地 GitHub APK 构建设置 `KAKU_UPDATE_CHANNEL=github`，并仅在此渠道申请 `REQUEST_INSTALL_PACKAGES`。从固定仓库的 latest release 读取正式版本，正式包只匹配 `kaku-release.apk`，debug 包只匹配 `kaku-debug.apk`。缺少匹配资源时显示失败，不拿其他渠道包顶替。
- 用户确认后才开始下载，显示字节进度比例，可取消；进度弹层可取消下载，关闭弹层也会取消未完成下载。下载后检查 HTTP 状态和文件大小，再让用户打开系统安装器。系统负责安装权限、包签名和覆盖安装判断；返回应用不代表安装成功。网络失败、无法调用安装器可重试或改用网页。首版不承诺杀进程续传。
- 增加了 `expo-intent-launcher` 原生依赖，新功能需重新构建客户端。旧开发客户端没有模块时显示网页下载入口，不崩溃。APK 放在缓存目录中的单一专用文件，下一次下载覆盖，不无限积累。
- 默认 `KAKU_UPDATE_CHANNEL=store`，不申请 APK 安装权限。Google Play 版本的专用更新接入尚未配置，不能把 GitHub 版本当作 Play 上架版本。
- iOS 正式上架后设置 `KAKU_IOS_APP_STORE_ID`，可用 `KAKU_IOS_STORE_COUNTRY` 指定检查地区（默认 `cn`）。客户端查询 Apple 商店版本，验证 bundle ID 后才显示更新，并打开 App Store 安装；不下载 Android APK。未配置 ID 或当前地区未上架时明确说明，不声称已是最新版。TestFlight 测试包仍通过 TestFlight 更新，没有假造公开 beta 版本查询接口。
- 原生安装版本取 `expo-application`，不会把 Metro 当前源码版本当成已经安装的整包版本。

24 小时检查 / 7 天提醒是本项目降低打扰的选择，并非行业规定。平台参考：[Android 应用内更新](https://developer.android.com/guide/playcore/in-app-updates)、[Apple 应用更新](https://support.apple.com/en-gb/102629)、[Expo 下载进度](https://docs.expo.dev/versions/latest/sdk/filesystem-legacy/)、[Expo 系统 Intent](https://docs.expo.dev/versions/latest/sdk/intent-launcher/)、[GitHub Releases API](https://docs.github.com/en/rest/releases/releases)。
