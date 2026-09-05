# 发版指南（Release）

Kaku Android 有两种发版方式：**本地构建**（推荐，不消耗 EAS 云端额度）和 **EAS 云端构建**（正式上架 Play 用）。

## 快速选择

| 场景 | 方式 |
|---|---|
| 日常迭代发 GitHub 安装包（当前 EAS 额度受限期间） | 本地构建 |
| 正式上架 Play（AAB，Google 自动按架构分发） | EAS 云端 `production` |
| 想在 GitHub Actions 里自动构建 + 发布 | EAS 云端 workflow |

---

## 方式一：本地构建（推荐日常使用）

**特点**：不消耗 EAS 免费额度（每月有限，约 9/1 重置）。只打 **arm64-v8a**（2021 年后绝大多数手机），debug 签名。产物按渠道命名：

| 渠道 | 命令参数 | 包名 | 安装包 |
|---|---|---|---|
| release（默认） | `release` | `com.shqingda.kaku` | `kaku-release.apk` |
| debug | `debug` | `com.shqingda.kaku.debug` | `kaku-debug.apk` |

### 前置

- 本机已配置 Android 开发环境（`ANDROID_HOME`、JDK 17），之前成功跑过 `expo run:android`
- `gh` 已登录（`gh auth status`）
- `apps/mobile/.env` 里有 `EXPO_PUBLIC_SENTRY_DSN`（本地包才能上报崩溃）
- 先改 `apps/mobile/app.config.js` 的 `version`，再按 [ReSource](https://github.com/kenischu/ReSource/releases) 的条目格式写好 `scripts/release-notes.md`（中文短句、一条一行、写清新增和修复）。安装/覆盖提示可以写在同一文件末尾，App 内更新日志不会收录这些行。
- 构建脚本会跑 `scripts/sync-changelog.mjs`：若 App 内日志还没有当前版本，就从 `release-notes.md` 自动补上；已经有当前版本则不覆盖手改内容。测试会检查最新一条版本号与 `app.config.js` 一致。

### 命令

```bash
# 先改版本和说明并 push。默认 tag 是 v<app 版本>（例如 v1.0.9），打 release 包：
bash scripts/build-split-apks.sh
# 等价于
bash scripts/build-split-apks.sh v1.0.9 release

# 其他渠道（tag 仍用 v 版本号，用第二参数区分渠道）
bash scripts/build-split-apks.sh v1.0.9 debug

# 只构建、不推送、不创建 Release
bash scripts/build-split-apks.sh v1.0.9 release --build-only
```

第一个参数是 GitHub Release **tag，必须是 `v<app 版本>`**，不要用 `android-1.0.0-n`。留空则用 `v<app.config.js 的 version>`。脚本在上传 APK 前会 `git push origin HEAD:main`。

### 做了什么

1. 按渠道设置 `EAS_BUILD_PROFILE`（决定 Android 包名和渠道图标）
2. 从 `.env` 注入 `EXPO_PUBLIC_*`（DSN 内联进 JS bundle，Sentry 本地包可用）
3. 把 `release-notes.md` 同步进 App 内更新日志（当前版本缺失时写入，必要时自动提交）
4. `expo prebuild --platform android` 同步原生工程（CNG 管理，android/ 不入库）
5. 禁用本地 Sentry source map 上传（保留给 EAS 云端构建）
6. 本地 `gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`，复制为 `kaku-<channel>.apk`
7. `gh release create` 上传该 APK，说明来自 `scripts/release-notes.md`

产物在 `apps/mobile/dist-split/`（已 gitignore）。

### 注意事项

- **签名**：本地产物用 debug 签名，与 EAS 签名的旧包不同——**安装前必须先卸载旧版**（Release 说明已注明）
- **架构**：只发 arm64-v8a。32 位机和 x86 模拟器不再提供安装包
- ABI 控制用的是 RN 的 `-PreactNativeArchitectures=<abi>` 参数（Expo SDK 57 已移除 `android.abiFilters` / `expo-build-properties` 的 ABI 支持，不要再用那些配置）
- 本地产物不上传 Sentry source map（堆栈是混淆/压缩的），崩溃会上报但定位不如 EAS 包精确
- Clash 代理会卡死 `git push` / `gh release`：执行前 `unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY`

---

## 方式二：EAS 云端构建（正式 / 上架）

**特点**：GitHub Actions 全自动、EAS 签名（与正式版一致）、Sentry source map 自动上传。依赖 EAS 免费额度（每月有限，用完后需等重置或升级）。

### 前置

- GitHub repo Secret：`EXPO_TOKEN`（在 https://expo.dev/settings/access-tokens 创建）
- 网络通畅（**本地 git push / EAS 上传前需 `unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY`**，Clash 代理会卡死连接）

### 命令（GitHub Actions）

1. 打开 https://github.com/shqingda/kaku/actions → **Release Android APK**
2. **Run workflow**：
   - `channel`：固定 `production`（`kaku-release.apk`，签名用于上架）
   - `tag`：必须是 `v<app 版本>`，如 `v1.0.9`（留空自动生成 `android-<channel>-<run_number>`，日常本地发版不要用这种）
3. 等待 10–20 分钟（有缓存更快），完成后 GitHub Releases 出现 APK

### 流程

1. `eas build --profile <channel> --platform android`（EAS 云端构建）
2. 轮询构建状态 → 下载 APK 并按渠道重命名
3. 创建 GitHub Release

### 注意事项

- **额度**：EAS 免费计划每月 Android 构建次数有限，用完后 workflow 会报错（"has used its Android builds from the Free plan"）。重置后可用，或升级付费
- **签名**：EAS 构建用 EAS keystore（云端保存），与本地 debug 签名不同——两者不能互相覆盖安装
- Sentry：`SENTRY_ORG` 已设置，source map 自动上传；`EXPO_PUBLIC_SENTRY_DSN`、`SENTRY_AUTH_TOKEN` 已配在 EAS env

---

## 版本号

- 当前 app 版本写在 `apps/mobile/app.config.js`，发版时先改这里
- EAS `production` profile 开了 `autoIncrement`（构建号自动 +1）
- 本地脚本默认 tag/标题：`v<app 版本>`（与 `app.config.js` 一致，例如 `v1.0.9`）。不要用 `android-1.0.0-<n>`

## 上架（Play）

- Play 上架必须用 **EAS 云端 `production` 构建 AAB**（`eas build -p android --profile production`），Google 会按设备架构自动分发
- 不要用本地 APK 上架（debug 签名 + 手动分发不符合要求）
- 商店素材、隐私政策、数据安全表单见对话记录
