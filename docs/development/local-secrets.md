# 本地密钥目录 `.secrets/`

从 2026-11-03 起，签名密钥、FCM 私钥和发布证据统一放在主仓库根目录的 `.secrets/`，不再放到项目外的 `~/.local/share/kaku-*`。整个目录由 `.gitignore` 排除，权限为目录 0700、文件 0600。

| 路径 | 内容 | 谁在用 |
| --- | --- | --- |
| `.secrets/android-signing/` | `legacy-debug.keystore`、`release.p12`、`release-password.txt`、`rotation.lineage` | `scripts/sign-android-release.sh` 默认读取；丢失后无法给已安装的正式包覆盖更新 |
| `.secrets/fcm/service-account.json` | FCM 发送账号 `kaku-fcm-sender@…` 的私钥 JSON | 写入 Worker Secret `FCM_SERVICE_ACCOUNT_JSON`；构建不需要 |
| `.secrets/release-evidence/` | 发布时的部署 JSON、签名矩阵、迁移前 D1 导出 | 只作历史证据；D1 导出含用户数据 |

## 注意事项

- **不要运行 `git clean -x` / `-X`**：这两个参数会删除被忽略的文件，`.secrets/` 会一起消失。普通 `git clean -fd` 不受影响。
- **worktree 没有这个目录**。签名脚本通过 `git rev-parse --git-common-dir` 找到主仓库，始终读取主仓库的 `.secrets/android-signing/`，不要把私钥复制到 worktree。
- **不要只留一份**。GitHub `android-release` Environment 的 Secrets 只能在 CI 里使用、无法读回原文件；Worker Secret 也读不回。`.secrets/` 仍需加密备份到 Mac 之外（密码管理器附件或加密磁盘）。
- 不要把目录内容贴到聊天、issue 或日志；需要核对时只比对 SHA-256 或证书指纹。
