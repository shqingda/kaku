# FCM / APNs 直连推送迁移（2026-10-17）

## 范围与状态

按用户确认，Android 后端直连 FCM HTTP v1，iOS 后端直连 Apple APNs；客户端保留 expo-notifications，获取原生设备 token。删除 Expo Push 发送 / 回执客户端、getExpoPushTokenAsync 调用和硬编码 projectId，不恢复 EAS 云构建入口。

本次仅本地实现与验证，未部署 Worker、未操作线上 D1 / Secret、未发布 APK。手机已断开，没有将新协议客户端安装到仍使用旧协议的线上后端。实际凭据配置和启用顺序见 [原生推送指南](../deployment/native-push.md)。

## 已验证

- 先验证新原生 token 登记与旧 Expo 登记拒绝测试失败，再接入 shared 协议、API 和数据迁移；Android FCM 与 iOS APNs token / 环境 / Topic 分开验证。
- 服务账号 RS256 和 APNs ES256 JWT 使用临时生成的测试密钥，验证实际签名、claims、缓存与超时。测试私钥不入库，不代替真实服务凭据。
- OAuth 失败恢复 / 过期刷新、固定认证域名、凭据缺失 503、混合结果游标、失效设备清理、会话撤销和新旧登记竞态测试通过。
- D1 在测试环境应用新增列迁移，旧记录、游标和账号保留；环境变化重新建立游标，旧快照不能删除或推进新登记。旧 Expo 网络协议的专用测试随实现删除，由原生服务错误语义和遗留数据兼容测试替代，未降低覆盖率阈值。
- native token 事件重复取 token 会导致重入，已用回归先复现；现直接消费事件值并忽略重复事件，相关组件回归通过。
- workspace 逻辑测试通过；API 覆盖率 94.03%，移动端覆盖率 94.75%，均通过原门禁。完整组件回归 63 个 suite / 351 项通过；类型检查、工具测试、Worker dry-run、iOS JS 导出及 Android Release 本地构建通过。后续新增回归的统计以最新测试输出为准。

本地 Android 产物为 `apps/mobile/dist-split/kaku-release.apk`，42,208,004 字节，SHA-256 `cfb8186493bffd6c3cf09526a0d812eb226ced154ac273827a841a00f00fe0ac`；版本仍为 1.1.19 / 构建号 5。验签与 16 KB 对齐通过，默认包名和旧签名不变，仅用于本地构建验证，不是面向已换签手机的升级候选。

## 限制与待验

- 尚未提供真实 Firebase 服务账号 / Apple p8 凭据，未验证真实 token 登记与通知送达、前台 / 后台 / 冷启动点击路由、GMS 及权限差异。
- APNs 本机系统 HTTP/2 无认证请求得到 403，说明端点可达；本机 workerd 发同类请求报 `Network connection lost`。官方同类问题见 [workerd #4841](https://github.com/cloudflare/workerd/issues/4841)。部署后的 Worker/APNs 传输需真实验收，本地 HTTP 适配器测试不算送达证据。
- 默认本地 APK 仍使用原签名，正式签名轮换候选包另见 [签名迁移记录](2026-10-17-signing-migration.md)。本次不把普通本地包覆盖到已换签手机。
- 搜索冒烟等待条件已改为只匹配“搜索结果”下的条目，避免输入框同名查询误命中；重跑时手机已断开，设备复验未完成，未将此流程标为通过。该修复与推送迁移分别提交。
