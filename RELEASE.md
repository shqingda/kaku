# 发版指南（Release）

Kaku Android 有两种发版方式：**本地构建**（推荐，不消耗 EAS 云端额度）和 **EAS 云端构建**（正式上架 Play 用）。

## 快速选择

| 场景 | 方式 |
|---|---|
| 日常迭代发 preview（当前 EAS 额度受限期间） | 本地构建 |
| 正式上架 Play（AAB，Google 自动按架构分发） | EAS 云端 `production` |
| 想在 GitHub Actions 里自动构建 + 发布 | EAS 云端 workflow |

---

## 方式一：本地构建（推荐日常使用）

**特点**：不消耗 EAS 免费额度（每月有限，9/1 重置）、完全控制 ABI、产出 4 个按 CPU 架构拆分的 APK（50–62MB 每个）。

### 前置

- 本机已配置 Android 开发环境（`ANDROID_HOME`、JDK 17），之前成功跑过 `expo run:android`
- `gh` 已登录（`gh auth status`）
- `apps/mobile/.env` 里有 `EXPO_PUBLIC_SENTRY_DSN`（本地包才能上报崩溃）

### 命令

```bash
bash scripts/build-split-apks.sh android-1.0.0-6
```

`android-1.0.0-6` 是 release tag，留空会自动生成。

### 做了什么

1. 从 `.env` 注入 `EXPO_PUBLIC_*`（DSN 内联进 JS bundle，Sentry 本地包可用）
2. `expo prebuild --platform android` 同步原生工程（CNG 管理，android/ 不入库）
3. 禁用本地 Sentry source map 上传（保留给 EAS 云端构建）
4. 本地 `gradlew assembleRelease` 构建 4 个架构：
   - `kaku-arm64-v8a.apk`（60MB）——2021 年后绝大多数手机
   - `kaku-armeabi-v7a.apk`（50MB）——旧 32 位设备
   - `kaku-x86_64.apk` / `kaku-x86.apk`（62MB）——模拟器
5. `gh release create` 自动发布到 GitHub Releases（英文说明）

产物在 `apps/mobile/dist-split/`（已 gitignore）。

### 注意事项

- **签名**：本地产物用 debug 签名，与 EAS 签名的旧包不同——**安装前必须先卸载旧版**（Release 说明已注明）
- ABI 控制用的是 RN 的 `-PreactNativeArchitectures=<abi>` 参数（Expo SDK 57 已移除 `android.abiFilters` / `expo-build-properties` 的 ABI 支持，不要再用那些配置）
- 本地产物不上传 Sentry source map（堆栈是混淆/压缩的），崩溃会上报但定位不如 EAS 包精确

---

## 方式二：EAS 云端构建（正式 / 上架）

**特点**：GitHub Actions 全自动、EAS 签名（与正式版一致）、Sentry source map 自动上传。依赖 EAS 免费额度（每月有限，用完后需等重置或升级）。

### 前置

- GitHub repo Secret：`EXPO_TOKEN`（在 https://expo.dev/settings/access-tokens 创建）
- 网络通畅（**本地 git push / EAS 上传前需 `unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY`**，Clash 代理会卡死连接）

### 命令（GitHub Actions）

1. 打开 https://github.com/shqingda/kaku/actions → **Release Android APK**
2. **Run workflow**：
   - `channel`：`preview`（独立安装包）或 `production`（正式包，签名用于上架）
   - `tag`：可自定义，如 `android-1.0.0-6`（留空自动生成 `android-<channel>-<run_number>`）
3. 等待 10–20 分钟（有缓存更快），完成后 GitHub Releases 出现 APK

### 流程

1. `eas build --profile <channel> --platform android`（EAS 云端构建 universal APK）
2. 轮询构建状态 → 下载 APK
3. 创建 GitHub Release

### 注意事项

- **额度**：EAS 免费计划每月 Android 构建次数有限，用完后 workflow 会报错（"has used its Android builds from the Free plan"）。重置后可用，或升级付费
- **签名**：EAS 构建用 EAS keystore（云端保存），与本地 debug 签名不同——两者不能互相覆盖安装
- Sentry：`SENTRY_ORG` 已设置，source map 自动上传；`EXPO_PUBLIC_SENTRY_DSN`、`SENTRY_AUTH_TOKEN` 已配在 EAS env

---

## 版本号

- 当前 app 版本 `1.0.7`（`apps/mobile/app.config.js`，发版时先改这里）
- EAS `production` profile 开了 `autoIncrement`（构建号自动 +1）
- 本地脚本默认用版本号作为 tag/标题：`v<app 版本>`（如 `v1.0.7`，第一个参数可覆盖；标题不再写死，参考 waku 的 releases）

## 上架（Play）

- Play 上架必须用 **EAS 云端 `production` 构建 AAB**（`eas build -p android --profile production`），Google 会按设备架构自动分发，用户实际下载约 50MB
- 不要用本地拆分 APK 上架（debug 签名 + 手动分发不符合要求）
- 商店素材、隐私政策、数据安全表单见对话记录
