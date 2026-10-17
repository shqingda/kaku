# 原生推送直连 FCM / APNs（2026-10-17）

用户已确认 Android FCM 与 iOS APNs 本次一起实现。

目标：保留 expo-notifications 与本地构建，移除 Expo Push 云端 token、发送、回执及账号依赖。仅本地实现与验证，不部署 Worker、不操作线上 D1、不公开发版。

## 实施切片

1. FCM HTTP v1 适配器：Worker Secret `FCM_SERVICE_ACCOUNT_JSON`，固定 Google OAuth / FCM 地址，RS256 JWT、短期 access token 缓存、12 秒超时、有限并发；验证真实签名与第三方响应，日志不输出私钥或设备 token。
2. 设备协议与存储：新增明确的 `provider: fcm`，仅 Android；数据库新增 provider 列，旧记录标为 expo，禁止当成 FCM 发送。旧客户端登记返回明确升级提示，注销仍接受旧 token。保留旧回执数据并按原保留期清理，不再请求 Expo。
3. 客户端：getDevicePushTokenAsync 获取 Android 原生 token，保存本机设备身份、处理 token 变化、撤销旧设备；会话变化时不登记旧账号。删除 Expo projectId 及云推送相关配置。iOS 原生 APNs token 登记时附带 sandbox / production 环境和白名单 bundle ID，后端用 Apple p8 密钥签 ES256 JWT，直接发 APNs；支持凭据缓存、时间戳保护和环境隔离。
4. 投递：首次登记仅建立游标；成功接收才推进游标，短暂失败保留游标下次 Cron 重试；仅永久 UNREGISTERED 删除当前登记，不因权限/凭据/载荷错误删设备。发送前及 token 获取后重新确认会话/登记，保留撤销安全边界。
5. 回归与文档：HTTP/OAuth/混合结果/失效设备/晚到回执及账号切换回归，迁移旧数据保留检查、类型检查、相关测试和本地打包验证。真实投递依赖 Firebase 服务账号，未配置不能宣称推送可用。

## 依据

- [FCM HTTP v1 与认证](https://firebase.google.com/docs/cloud-messaging/send/v1-api)
- [Google 服务账号 JWT](https://developers.google.com/identity/protocols/oauth2/service-account)
- [FCM 错误语义](https://firebase.google.com/docs/cloud-messaging/error-codes)
- [expo-notifications 原生 token](https://docs.expo.dev/push-notifications/sending-notifications-custom/)
