import { pushRegistrationSchema, type PushRegistration } from '@kaku/shared/push-contract';

export function nativePushRegistration(
  platform: string, token: unknown,
  pushConfig?: { apnsEnvironment?: unknown; apnsTopic?: unknown },
): PushRegistration {
  const result = pushRegistrationSchema.safeParse(platform === 'android'
    ? { platform, provider: 'fcm', token }
    : { platform, provider: 'apns', token, apnsEnvironment: pushConfig?.apnsEnvironment, apnsTopic: pushConfig?.apnsTopic });
  if (!result.success) throw new Error(platform === 'ios'
    ? '当前安装的推送环境配置不完整，需要更新 Kaku 后重试。'
    : '未能取得有效的设备推送令牌，请稍后重试。');
  return result.data;
}
