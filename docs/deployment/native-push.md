# 原生推送：Android FCM 与 iOS APNs

客户端保留 `expo-notifications`，用 `getDevicePushTokenAsync()` 获取原生设备 token；Kaku Worker 分别直连 Firebase FCM HTTP v1 和 Apple APNs，不再调用 Expo Push。EAS 云构建、本地 Expo CLI 与推送服务配置是不同的事，本地构建不需要 Expo 登录。

当前代码已实现，尚未部署到生产，也未用真实服务端凭据验收通知送达。签名迁移与推送迁移分别验收；不要把当前本地构建生成的旧签名 APK 覆盖到已经换签的手机。

## Firebase / FCM 配置

很久没登录 Firebase 不会自动使客户端配置失效。需要在控制台确认项目、API、服务账号及应用限制仍有效：

1. 现有 `apps/mobile/google-services.json` 对应项目 `kaku-2f94c`，已登记 `com.shqingda.kaku` 和 `com.shqingda.kaku.debug`。后端服务账号必须有权向该项目发送消息。
2. 在 Google Cloud 确认 Firebase Cloud Messaging API（HTTP v1）已启用，不使用已经废弃的 legacy server key。
3. 准备有 FCM 发送权限的服务账号 JSON；建议使用用途单一的账号，授予 `Firebase Cloud Messaging API Admin`（`roles/firebasecloudmessaging.admin`，包含 `cloudmessaging.messages.create`），避免项目 Owner 权限，也不复用 Firebase Admin SDK 的广泛权限账号。服务端用其中的 `project_id`、`client_email`、`private_key`；OAuth 地址固定为 Google 官方域名，不使用文件提供的任意 token_uri。
4. JSON 原件安全保存在仓库外，写入 Worker Secret `FCM_SERVICE_ACCOUNT_JSON`。不要放入 `EXPO_PUBLIC_*`、APK、Git 或聊天；`google-services.json` 是客户端配置，不是这个私钥文件。
5. 如果客户端 Google API key 配置了 Android 应用限制，核对包名与新旧 SHA-1 指纹。新证书 SHA-1 为 `8d03597f65c33bf8bdde7bb5ea87b6a8e2e6d3b3`；旧证书为 `5e8f16062ea3cd2c4a0d547876baa6f38cabf625`。仅在实际使用应用限制时需要登记，不能把签名指纹误当成 FCM 服务端认证。

FCM 仍依赖手机的 Google Play 服务和到 Google 的网络。直连 FCM 不等于解决国产设备的 GMS、后台限制或代理连通性问题。

仅准备 Secret、暂不部署时，使用 `wrangler versions secret put FCM_SERVICE_ACCOUNT_JSON` 并从仓库外文件传入标准输入；普通 `wrangler secret put` 会立即部署新版本，不适合这个阶段。准备后记录未部署版本 ID，并再次核对线上 deployment 未改变。后续部署前仍需复核目标版本保留了该 Secret。

## Apple APNs 配置

- 在 Apple Developer 准备启用 APNs 的签名密钥 `.p8`、Key ID、Team ID，对应 App ID 需启用 Push Notifications。
- Worker Secrets：`APNS_PRIVATE_KEY`（PEM 原文）、`APNS_KEY_ID`、`APNS_TEAM_ID`。这些是推送凭据，与 Android APK 签名密钥无关。
- iOS 客户端登记 `apnsEnvironment`（sandbox / production）与 `apnsTopic`（实际 bundle ID，白名单为正式及 debug 包名）。不能用 APNs token 直接调用 FCM。
- 本地 iOS dev client 默认 sandbox；正式构建默认 production。可用 `KAKU_APNS_ENVIRONMENT=sandbox|production` 显式设置，Expo 配置同时写入推送元数据和 `aps-environment` entitlement。最终以实际签名的 provisioning profile / entitlements 为准，真机安装时须核对；配置变化后要重新构建原生包。
- APNs 使用 HTTP/2。2026-10-17 本机系统 HTTP/2 客户端的无认证请求得到预期 403，但本机 workerd 请求报 `Network connection lost`；官方仓库存在同类 macOS 本地问题。尚未验证部署后 Worker 到 APNs 的真实连接，不能把本地适配器测试视为真实送达通过。不要为绕过这个问题把私钥发给第三方代理。

## 现有测试设备

用户目前只有 Mac、既有 iOS 模拟器和小米 13 Ultra，没有 iOS 实机。Android 实际送达使用小米验证；覆盖安装须沿用签名轮换与递增构建号，保留已登录账号及应用数据。

本机为 Apple silicon、macOS 27.0.1，既有模拟器为 iPhone 18 Pro / iOS 27.0。Apple 从 Xcode 14 起支持符合硬件和系统条件的模拟器连接 APNs sandbox，因此可以尝试真实沙盒投递；这与 `simctl push` 本地注入不同。当前客户端仍有 `isPhysicalDevice()` 拦截，尝试沙盒登记前需单独处理并验证；不能把能力条件满足写成实测通过。正式 APNs 环境、iPhone 的后台和锁屏行为仍未验收。不需要为 Android 配置购买 iPhone。

## 登记与投递约定

`PUT /me/push-devices` 使用已有登录认证，Android 发送 `{ provider: 'fcm', platform: 'android', token }`；iOS 发送 `{ provider: 'apns', platform: 'ios', token, apnsEnvironment, apnsTopic }`。

旧客户端的 Expo token 登记得到 426 和更新提示，旧 token 的精确注销继续可用。缺少相应服务端 Secret 时返回 503，客户端显示失败并可重试，不假装开启成功。native token 刷新或回到前台时重新登记；token 更换前精确注销本机保存的旧 token。会话撤销、账号切换及登记版本保护继续生效，不按用户批量删除其他设备。

后端每 15 分钟检查上游通知，首次登记仅建立游标，不补发旧消息。每批 100 台，最多 4 个用户并行、每用户最多 4 个设备请求；单次网络请求 12 秒截止。OAuth / APNs JWT 在同一 Worker 环境中缓存并按有效期更新；发送前再次检查当前会话与登记身份。

FCM/APNs 接受后只推进成功设备的游标；失败设备保留游标，下次 Cron 再试，不在一次轮询里密集重试。FCM 仅 `UNREGISTERED` 删除失效登记；APNs 仅时间戳覆盖当前登记的 `410 Unregistered` 删除。权限、凭据、载荷、环境/Topic 错误和未知结果都不删除 token。永久失效清理仍匹配 sessionId + registrationId，晚到结果不会删除同 token 的新登记。

服务商接受不代表手机已显示；发送成功但数据库提交失败可能导致下次重复发送，不承诺严格恰好一次。通知内容仍遵守原有摘要策略，日志只记录用户 ID、服务商及受控错误类别，不输出私钥、JWT、token 或消息正文。

## 启用顺序（本次未执行）

1. 准备并安全备份 Firebase / Apple 推送凭据，设置 Worker Secrets。
2. 审核并应用 D1 迁移 `0010_bumpy_true_believers.sql`，仅新增 provider / APNs 环境与 topic 列；旧设备默认 expo，原 token、账号与游标不清空。旧回执表保留，按原 24 小时保留期自然清理，不再请求 Expo receipts。
3. 部署新 Worker。旧 Expo 设备不发送到 FCM/APNs，并记录需升级的指标；此时旧客户端需更新才能恢复登记。线上旧推送不会因为本地改动自动改变。
4. 构建并内部安装新客户端，保持正确 APK 签名轮换和递增构建号；实测登记、前台/后台/冷启动、点击进入通知页、token 更新、关闭/重开、退出及撤销会话。当前设备不做退出、撤销会话等可能改变现有登录的测试。iOS 可按设备条件尝试 APNs sandbox；正式环境和真机行为留待 iPhone 验证。
5. 复核成功后再决定公开发版。`EXPO_ACCESS_TOKEN` 在此代码中已不使用，生产 Secret 的删除应等新路径验收后单独进行；本次没有操作远端 Secret。

## 官方依据

- [Firebase HTTP v1 与认证](https://firebase.google.com/docs/cloud-messaging/send/v1-api)
- [FCM IAM 角色和权限](https://docs.cloud.google.com/iam/docs/roles-permissions/firebasecloudmessaging)
- [Cloudflare Secrets 与版本部署](https://developers.cloudflare.com/workers/configuration/secrets/)
- [FCM 错误语义](https://firebase.google.com/docs/cloud-messaging/error-codes)
- [Expo 获取原生推送 token](https://docs.expo.dev/push-notifications/sending-notifications-custom/)
- [Apple token 认证](https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns)
- [APNs 请求](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns)
- [Xcode 14 模拟器 APNs sandbox 支持条件](https://developer.apple.com/documentation/xcode-release-notes/xcode-14-release-notes)
- [workerd 的 APNs 本地 HTTP/2 问题记录](https://github.com/cloudflare/workerd/issues/4841)
