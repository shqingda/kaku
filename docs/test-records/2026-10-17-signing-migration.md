# Android 签名迁移内部测试记录（2026-10-17）

## 状态与决定

仅完成内部候选包及静态检查，未公开发布。用户要求不安装旧模拟器，设备验证暂缓；优先验收 Android 13 及以上，Android 10–12L 保留兼容路径。本次没有修改默认构建脚本、受版本控制的 Expo 配置或公开发布版本。

构建模式与签名是两回事：本次是 **Release 正式构建**，不是 debug 开发包；同一 APK 在不同系统上使用不同签名。

| 系统 | 实际签名 | 迁移策略 |
| --- | --- | --- |
| Android 13+（API 33+） | 新 `Kaku Release` 证书 | 使用旧→新轮换证明覆盖更新，作为主要设备验收范围 |
| Android 10–12L（API 29–32） | 原 Android Debug 证书 | 沿用旧签名兼容更新，不承诺此阶段全面换签 |
| Android 9 及以下 | 不支持此内部包 | 候选包 minSdkVersion 为 29，不改变默认公开构建的最低系统版本 |

采用 v3 / v3.1 与 `rotation-min-sdk-version=33`，遵循官方默认轮换路径，避免在旧系统上强制轮换。证明中旧签名的 `installed-data=true`，`rollback=false`。后续签名必须保留同一条 lineage，不能在完成迁移后随意改回旧签名；这不保证所有旧系统或厂商行为均已验收。

## 产物与静态证据

- 基于源码提交 `67b0b54` 的现有本地原生工程构建；候选包临时调整生成工程的 minSdkVersion / versionCode，构建后恢复 build.gradle。
- APK：`apps/mobile/dist-split/kaku-internal-rotation-api33-vc6.apk`（本机忽略产物，不入库）。
- 包名：`com.shqingda.kaku`，未改变。
- 版本：`1.1.19`，versionCode `6`；targetSdkVersion `36`，ABI `arm64-v8a`。
- 文件大小：52,872,374 字节。
- APK SHA-256：`85c56ea14ce1031ba0bb09069e50cbfb4f5cb66461b1a97a07abc6e43d138914`。
- 旧证书 SHA-256：`fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`，与既有 v1.1.18 / v1.1.19 发布记录一致。
- 新证书 SHA-256：`39ba0d1b81d5d64d9d086717415d07455c1521e4eea568289e949f713218e8b7`，RSA 3072。
- 本地 Release 构建成功；`apksigner verify` 确认 v3 / v3.1 签名及系统分段证书；API 29、30、31、32、33、34、35、36 分别验签通过；16 KB ZIP 对齐检查通过。
- 详细本机产物记录：同目录 `.txt` 与 `.verification.json`。

这些是构建和签名检查，不等于系统实际允许覆盖安装，更不等于登录、草稿和历史已验证无损。此次未连接 Android 设备、未安装模拟器、未安装或清除任何用户应用数据。

## 本机密钥备份

目录：`/Users/shqingda/.local/share/kaku-signing/2026-10-17-rotation/`，位于仓库外。目录权限 `700`，私钥库及口令文件权限 `600`。项目文档只记录位置、用途和公开证书指纹，不存放密钥或口令内容。

| 文件 | 用途 |
| --- | --- |
| `legacy-debug.keystore` | 原签名私钥备份；alias 为 `androiddebugkey`，复制后已校验与原文件一致 |
| `baseline-v1.1.19.apk` | 本地旧签名基线包，versionCode 5；不是额外下载的公开旧包 |
| `release.p12` | 新发布私钥，alias 为 `kaku-release` |
| `release-password.txt` | 新私钥库口令，只在本机受限目录保存 |
| `rotation.lineage` | 旧→新签名轮换证明，后续构建需继续使用 |
| `README.txt` / `candidate-notes.txt` | 本机保管说明和候选包验证记录 |

目前只是同机备份，不具备异地灾备能力。公开迁移前需由所有者将旧密钥、新密钥、口令和 lineage 另做安全的离线或加密异地备份，禁止提交 Git 或随 APK 分发。

## 待验证与发布前条件

写文档、保管密钥和静态验签不需要手机。实际覆盖更新及数据保留验证需要 Android 设备；当前按用户要求暂缓，不能承诺已实现无损迁移。

- [ ] Android 13+：在独立测试设备安装公开旧签名包，准备非敏感测试登录、草稿、历史及设置，记录更新前状态。若已有 Kaku，先核对其版本和签名，保留应用及数据。
- [ ] 不卸载、不清数据，通过正常安装器覆盖到候选包，核对应用 UID、版本、实际新证书和启动结果。
- [ ] 检查 SecureStore 登录凭据可读、账号保持；SQLite 草稿、历史及设置完整，重启后仍在。数据库升级也需单独验证。
- [ ] 验证通知注册、深链、应用内下载与安装流程；核对依赖证书指纹的外部服务是否需要登记新证书。
- [ ] 再覆盖到使用同一新密钥和 lineage 的更高构建号候选包，验证连续升级路径。
- [ ] Android 10–12L 的实际安装兼容性仅作为后续补验，不把静态验签当作设备验收通过。
- [ ] 完成安全异地备份，再将经验证的签名策略接入可复现的正式构建入口。当前默认 `pnpm build:android` 仍使用原 Debug 签名，不会自动复现本次迁移包。

内部构建号 6 已占用；后续公开版本应使用大于 6 的构建号，避免测试用户降级或更新受阻。不得依靠卸载重装保留数据：Android 卸载会删除 SecureStore 使用的 Keystore 项，系统备份不能保证恢复登录。连接设备与内部验收不代表授权推送、公开发布或商店提交。

## 官方依据

- [apksigner 参数及轮换示例](https://developer.android.com/tools/apksigner)
- [APK 签名方案 v3.1：按系统版本选择新旧签名](https://source.android.com/docs/security/features/apksigning/v3-1)
- [Android 更新条件](https://developer.android.com/google/play/app-updates)
- [SecureStore 更新与卸载后的数据行为](https://docs.expo.dev/versions/latest/sdk/securestore/)
