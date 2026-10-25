# 构建与发版指南

先选构建入口，再决定是否发布。源码版本以 [Expo 配置](../../apps/mobile/app.config.js) 为准，已发布产物以 [GitHub Releases](https://github.com/shqingda/kaku/releases) 为准。当前发布版本 v1.1.22 提供 44.48 MB 正式包，升级 Expo SDK 58 并保留分系统签名轮换与 FCM，构建及上传核验见 [发布记录](../test-records/2026-10-24-release-1.1.22.md)。v1.1.21 的 53.06 MB 包见 [此前记录](../test-records/2026-10-18-release-1.1.21.md)。v1.1.19 的 42.21 MB 历史包见 [此前记录](../test-records/2026-10-16-release-1.1.19.md)。v1.1.18 的正式和独立 debug 包见 [历史记录](../test-records/2026-10-03-android-images.md)。本地正式包和 GitHub APK 均默认启用 R8 与资源裁剪；调试包保持关闭。此前 v1.1.15 同版本安装包替换见 [历史记录](../test-records/2026-10-03-release-1.1.15.md)，早期裁剪对比见 [2026-10-02 记录](../test-records/2026-10-02-project-optimization.md)。Android 实机兼容性仍待验。

## 纯本地构建

前置：Node / pnpm、Android SDK（`ANDROID_HOME`）、JDK 17、Python 3。原生目录由 Expo prebuild 生成，不入库。若要保留运行时崩溃上报，在 `apps/mobile/.env` 配置 `EXPO_PUBLIC_SENTRY_DSN`；纯构建不要求 Expo / EAS 或 GitHub 登录，也不需要发版说明。

从 v1.1.20 起，正式包最低 Android 10 / API 29，并使用正式签名轮换。还需 Android build-tools 36.0.0 及仓库外签名目录，默认 `$HOME/.local/share/kaku-signing/2026-10-17-rotation/`，可用 `KAKU_SIGNING_DIR` 指定其他安全目录。必须包含 `legacy-debug.keystore`、`release.p12`、`release-password.txt`、`rotation.lineage`；缺失时停止，不回退到旧签名。签名脚本分 API 29 / 32 / 33 / 36 核对证书并检查 16 KB 对齐，全部通过后才替换最终 APK。`debug` 独立包仍使用开发证书。

构建、签名和发布不需要连接手机。手机用于额外验证覆盖、数据保留和真实通知送达；未连接时在发布记录中保留未验范围。

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

纯构建生成原生工程、打包、报告体积并归档本地产物记录，不改受版本控制的文件、不更新日志、不提交、不推送、不创建 Release，也不清空其他候选产物。使用 `SENTRY_DISABLE_AUTO_UPLOAD=true` 禁止本地上传 source map，运行时 Sentry 保留。`expo run:android` / `expo run:ios` 则是日常开发客户端入口。

### 发行产物与 source map

纯构建结束后，`record-android-artifact.py` 在 `dist-split/<APK 名>-<完整 SHA-256>.sources/` 保存 `manifest.json`、同次 Gradle 的 Hermes bundle / 组合 source map 以及本轮启用 R8 时的 mapping（非裁剪构建不收录旧文件）。先比较 APK 内 bundle 与构建目录中的 bundle，失败则停止归档；记录版本、构建时 Git 提交、工作区是否有未提交修改及每个文件的摘要。相同 APK 再构建时校验并复用既有记录。

整个目录沿用 `dist-split/` 的 Git 忽略规则，应与验收 APK 一起保留。缺少的文件明确写入 `missing`，不声称此类堆栈已可还原。当前历史 APK 未随包保存的 map 不能用今天重新导出的 map 冒充；本轮工具测试也不代表真实 Sentry 上报验收。脚本不上传任何文件，发布时仍只上传已验证 APK。实现与检查边界见 [本轮记录](../test-records/2026-10-25-reliability-slimming-performance.md)。

### macOS 代理下 Gradle 下载停滞

`unset http_proxy ...` 只移除 shell 环境变量，Java 仍可能读取 macOS 系统代理；
TUN 开启时，忽略显式代理也不等于绕过 TUN。不要因此修改系统代理、IPv6 或局域网共享设置。
2026-10-16 和 2026-10-18 均遇到 Java 保留代理 host 后下载停滞；可对单次构建明确配置：

```bash
env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY -u all_proxy -u ALL_PROXY \
  GRADLE_OPTS='-Djava.net.useSystemProxies=false -Dhttp.proxyHost= -Dhttps.proxyHost= -DsocksProxyHost= -Dorg.gradle.logging.level=info -Dorg.gradle.internal.http.socketTimeout=30000 -Dorg.gradle.internal.http.connectionTimeout=30000' \
  pnpm build:android
```

这里将单次 HTTP 连接/读取超时设为 30 秒并输出下载位置，不修改全局 Gradle 配置。
仍卡住时先用日志里的同一个具体文件比较无显式代理与 `127.0.0.1:7890` 的下载，
不能只因系统开了代理就断定代理节点故障。不要并行启动两份正式构建。

### 测量与裁剪

先保存相同工具版本、ABI、签名、渠道的非裁剪对照包，再构建默认裁剪包。比较源码范围也要记录，不能把依赖升级或不同 ABI 当作优化收益。

```bash
bash scripts/build-android.sh release --no-optimize
bash scripts/build-android.sh release
python3 scripts/report-apk-size.py apps/mobile/dist-split/kaku-release.apk --baseline apps/mobile/dist-split/kaku-release-unoptimized.apk
# 添加 --json 得到 SHA-256、分类字节数和变化比例
```

报告按 ZIP 压缩后大小分类为原生库、DEX、JS、资源和其他，单列 ZIP/签名/对齐开销；它不是安装后的磁盘占用。仓库资产清理另记，不合并到 APK 收益。

正式包通过 Expo 配置源默认打开 `enableMinifyInReleaseBuilds` 与 `enableShrinkResourcesInReleaseBuilds`；两项配置的用途见 [Expo 构建配置](https://docs.expo.dev/versions/latest/sdk/build-properties/)。本地发布入口默认上传裁剪后的 `kaku-release.apk`；纯构建显式传入 `--no-optimize` 才关闭，并使用独立文件名。脚本按参数确定开关，旧 shell 或 `.env` 中的 `KAKU_OPTIMIZE_NATIVE=0` 不会悄悄关闭默认裁剪。直接调用 Expo 配置时可用 `KAKU_OPTIMIZE_NATIVE=0` 生成诊断配置。

v1.1.14 是早期裁剪包，v1.1.15 首次发布未裁剪，后按用户要求替换为裁剪包；原产物与替换产物的摘要分别保留在发布记录中。Android 运行验收仍待完成。直接使用忽略的 `android/` 工程会沿用上次生成的设置，下一次应从纯构建入口重新生成所需配置。

## 分步准备与发布 GitHub Release

准备、构建、上传和发布分别执行。推送和发布仍需要用户明确授权；构建和上传脚本不会隐式提交、推送或发布。

1. 修改 Expo 配置的版本，编写 `scripts/release-notes.md`。
2. 显式运行 `node scripts/sync-changelog.mjs` 准备 App 内日志；检查完整差异并通过回归后提交。已有版本不覆盖手改内容，安装提示不收入 App 内日志。
3. 运行 `pnpm build:android`，核对签名、版本、权限和回归结果。已有验收 APK 时直接复用，不重新构建。
4. 获得推送授权后，将对应提交推到目标分支；按下节创建草稿、上传和核验。发布是最后一个独立步骤。

兼容入口 `bash scripts/build-split-apks.sh [tag] [release|debug] [--build-only]` 仍校验渠道及标签，但现在只调用纯构建并提示分步流程；省略标签时取当前 App 版本。

- 正式包 Android 13+ 使用新证书及旧→新轮换证明；Android 10–12L 保留旧证书兼容。后续继续使用同一 lineage 并递增构建号，不能给已换签的安装回退到仅旧签名包。
- 只构建 arm64-v8a，不支持 32 位机和 x86 模拟器；ABI 参数是 `-PreactNativeArchitectures=arm64-v8a`。
- 本地归档 source map 与产物对应关系，但不上传；真实 Sentry 堆栈还原仍待凭据和设备验收。
- 构建完成只证明可编译，发布前仍要核对签名、版本和权限；实际设备安装、运行及未验范围另行记录。

## GitHub APK 上传固定方式

下次本机发版优先复用 v1.1.21 成功方式：`curl --http2`，显式 SOCKS5
`127.0.0.1:7890`，关闭 `Expect`，15 秒连接超时、900 秒总超时并显示上传进度。
本次约 8 分钟传完 53.06 MB；没有输出响应不代表卡死，应看上传百分比。
保留 FlClash / TUN 配置，清除代理环境变量，仅上传命令显式使用 SOCKS5。
2026-10-24 的 v1.1.22 在 SOCKS5 上传到 100% 后发生连接重置；确认远端无资产、
上传端点无显式代理可达后，改用 `--noproxy '*'` 的同一 HTTP/2 流程成功。
此为经过检查后的备用路径，不自动重试、不改系统代理；仍须核对大小及摘要。

上传脚本只接受固定仓库的已有草稿与已验证 APK，先检查远端同名资源。
已有资源的大小和 SHA-256 相符时直接结束；不一致时停止，不覆盖。
上传超时也先重新查询资源确认结果，不自动重试或重新构建。

```bash
set -e # 任一步失败即停止，保留草稿
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY
TAG=v1.1.22 # 改成实际版本；从仓库根目录执行
# 新版本只创建草稿，不在这一步附加 APK。已存在草稿则跳过这条。
gh release create "$TAG" --repo shqingda/kaku --draft --title "$TAG" \
  --notes-file scripts/release-notes.md --target "$(git rev-parse HEAD)"
python3 scripts/upload-github-apk.py "$TAG"
# 独立 debug 包：加 --apk apps/mobile/dist-split/kaku-debug.apk
# 仅在上一步成功、对应提交及设备验收确认、用户明确授权发布后执行。
gh release edit "$TAG" --repo shqingda/kaku --draft=false --latest
```

令牌通过 stdin 传给 curl，不写入脚本、日志或进程参数。上传失败保留草稿，
再次执行前先检查资源；不自动重试、不盲目 `--clobber`，也不发布缺少 APK 的版本。
GitHub API / git push 继续使用清除代理环境变量的普通命令。

## 签名迁移内部候选包

2026-10-17 已制作并实测构建号 6 的 Release 内部包。用户随后授权正式发版，v1.1.20 / 构建号 7 将同一签名策略接入正式本地入口，见 [发布记录](../test-records/2026-10-17-release-1.1.20.md)。密钥备份、首次覆盖、登录及本机设置保留证据见 [迁移记录](../test-records/2026-10-17-signing-migration.md)。草稿、完整历史和本次连续升级仍待验，不承诺所有设备或全部数据无损。

## 配置与账号边界

当前仅维护本地构建和本地上传 GitHub Release 的流程，已移除 EAS 云构建配置、命令和依赖 EAS 的 GitHub Actions 发版工作流。本地使用 `KAKU_BUILD_PROFILE=production` 选择正式包名；未设置时使用 debug 包名。构建脚本按 release / debug 参数设置该变量。

版本和 Android 构建号由 `app.config.js` 本地维护；GitHub APK 已接入签名轮换，Play 签名与上架流程仍未配置，GitHub 发版不等于商店提交。

Expo SDK / CLI 仍用于原生工程生成和本地开发，不要求登录 Expo。`apps/mobile/.expo/` 是自动生成的本机开发目录，保存设备记录、路由类型等，可删除，开发时会再生成，保持 Git 忽略。推送改为原生 FCM / APNs，已移除 `extra.eas.projectId`，配置和上线顺序见 [原生推送指南](native-push.md)。

## 应用内检查更新

账户 → 设置与本地 → 点击“检查更新”直接检查，右侧显示加载转圈，不跳转页面。手动检查无新版提示“已是最新版”，有新版直接询问是否下载；自动检查无新版或失败均不弹框。正式客户端启动或回到前台时自动检查，最多每 24 小时一次。同一版本自动提醒后 7 天内不再提示；新版本可再次提示。检查失败也遵守自动冷却，手动重试不受限制。开发模式不自动弹更新提醒。

- `scripts/build-split-apks.sh` 为本地 GitHub APK 构建设置 `KAKU_UPDATE_CHANNEL=github`，并仅在此渠道申请 `REQUEST_INSTALL_PACKAGES`。从固定仓库的 latest release 读取正式版本，正式包只匹配 `kaku-release.apk`，debug 包只匹配 `kaku-debug.apk`。缺少匹配资源时显示失败，不拿其他渠道包顶替。
- 用户确认后才开始下载，显示字节进度比例，可取消；进度弹层可取消下载，关闭弹层也会取消未完成下载。下载后检查 HTTP 状态和文件大小，再让用户打开系统安装器。系统负责安装权限、包签名和覆盖安装判断；返回应用不代表安装成功。网络失败、无法调用安装器可重试或改用网页。首版不承诺杀进程续传。
- 增加了 `expo-intent-launcher` 原生依赖，新功能需重新构建客户端。旧开发客户端没有模块时显示网页下载入口，不崩溃。APK 放在缓存目录的单一专用文件 `kaku-update.apk`，完成下载后保存目标版本与文件大小；下一次下载替换该文件，取消或失败会清理未完成文件。
- 安装器返回后保留 APK。后续启动读取原生安装版本，只有本机版本不低于记录目标、已有文件大小与记录一致时才自动清理文件和记录；未知旧文件或大小不符的文件不自动删除。账户页“清理缓存”可显式重试清理，活动下载、安装及清理共用文件占用保护，不互相打断。自动清理失败只记诊断，不影响正常启动；真实覆盖安装仍按 Android 实机事项验收。
- 默认 `KAKU_UPDATE_CHANNEL=store`，不申请 APK 安装权限。Google Play 版本的专用更新接入尚未配置，不能把 GitHub 版本当作 Play 上架版本。
- iOS 正式上架后设置 `KAKU_IOS_APP_STORE_ID`，可用 `KAKU_IOS_STORE_COUNTRY` 指定检查地区（默认 `cn`）。客户端查询 Apple 商店版本，验证 bundle ID 后才显示更新，并打开 App Store 安装；不下载 Android APK。未配置 ID 或当前地区未上架时明确说明，不声称已是最新版。TestFlight 测试包仍通过 TestFlight 更新，没有假造公开 beta 版本查询接口。
- 原生安装版本取 `expo-application`，不会把 Metro 当前源码版本当成已经安装的整包版本。

24 小时检查 / 7 天提醒是本项目降低打扰的选择，并非行业规定。平台参考：[Android 应用内更新](https://developer.android.com/guide/playcore/in-app-updates)、[Apple 应用更新](https://support.apple.com/en-gb/102629)、[Expo 下载进度](https://docs.expo.dev/versions/latest/sdk/filesystem-legacy/)、[Expo 系统 Intent](https://docs.expo.dev/versions/latest/sdk/intent-launcher/)、[GitHub Releases API](https://docs.github.com/en/rest/releases/releases)。
