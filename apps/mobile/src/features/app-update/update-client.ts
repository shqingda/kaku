import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { parseGithubRelease, type UpdateRelease } from './update-policy';

export const installedVersion = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0.0.0';
export const releasePage = 'https://github.com/shqingda/kaku/releases/latest';
const config = Constants.expoConfig?.extra?.appUpdate;
export const updateSupport = Platform.OS === 'android' && config?.channel === 'github'
  ? 'apk' : Platform.OS === 'ios' && /^\d+$/.test(config?.iosAppStoreId ?? '') ? 'app-store' : 'unconfigured';
export const unavailableMessage = Platform.OS === 'ios'
  ? 'iOS 更新渠道尚未配置，请通过当前分发方式（TestFlight 或 App Store）查看更新。'
  : '当前安装渠道尚未配置版本检查，请通过原安装渠道查看更新。';

export async function fetchLatestRelease(): Promise<UpdateRelease> {
  if (updateSupport === 'unconfigured') throw new Error(unavailableMessage);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const url = updateSupport === 'apk'
      ? 'https://api.github.com/repos/shqingda/kaku/releases/latest'
      : `https://itunes.apple.com/lookup?id=${config.iosAppStoreId}&country=${encodeURIComponent(config.iosCountry ?? 'cn')}`;
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? '检查过于频繁，请稍后重试。' : `更新服务暂不可用（${response.status}），请重试。`);
    const data = await response.json();
    if (updateSupport === 'apk') {
      if (!Application.applicationId) throw new Error('无法识别当前安装渠道，请通过原安装渠道查看更新。');
      return parseGithubRelease(data, Application.applicationId.endsWith('.debug') ? 'kaku-debug.apk' : 'kaku-release.apk');
    }
    const app = data.results?.find((item: { bundleId?: string }) => item.bundleId === Application.applicationId);
    if (!app || typeof app.version !== 'string') throw new Error('当前地区暂未找到此应用的上架版本。');
    return { version: app.version, notes: typeof app.releaseNotes === 'string' ? app.releaseNotes : '', pageUrl: `https://apps.apple.com/app/id${config.iosAppStoreId}` };
  } catch (error) {
    if (controller.signal.aborted) throw new Error('检查更新超时，请重试。');
    throw error instanceof Error ? error : new Error('检查更新失败，请确认网络后重试。');
  } finally { clearTimeout(timeout); }
}
