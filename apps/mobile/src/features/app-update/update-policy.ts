export const CHECK_INTERVAL = 24 * 60 * 60 * 1000;
export const REMIND_INTERVAL = 7 * CHECK_INTERVAL;
export type UpdateRelease = {
  version: string;
  notes: string;
  pageUrl: string;
  apk?: { url: string; size: number };
};
export function isNewerVersion(latest: string, installed: string) {
  const parse = (value: string) => /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value)?.slice(1).map(Number);
  const next = parse(latest), current = parse(installed);
  if (!next || !current) throw new Error('版本号无法识别，请前往发布页面确认。');
  for (let i = 0; i < 3; i++) {
    if (next[i] !== current[i]) return next[i] > current[i];
  }
  return false;
}
export function checkDue(last: number, now: number) {
  return !Number.isFinite(last) || last <= 0 || now < last || now - last >= CHECK_INTERVAL;
}
export function shouldRemind(version: string, previous: { version?: string; at?: number }, now: number) {
  return previous.version !== version || !previous.at || now < previous.at || now - previous.at >= REMIND_INTERVAL;
}
export function parseGithubRelease(value: unknown, apkName: string): UpdateRelease {
  const data = value as Record<string, any>;
  if (!data || data.draft || data.prerelease || typeof data.tag_name !== 'string' || !/^v\d+\.\d+\.\d+$/.test(data.tag_name)) throw new Error('未找到可用的正式版本。');
  const pageUrl = `https://github.com/shqingda/kaku/releases/tag/${data.tag_name}`;
  const asset = Array.isArray(data.assets) ? data.assets.find((a: any) => a.name === apkName && a.state === 'uploaded') : undefined;
  if (!asset || typeof asset.browser_download_url !== 'string' || !asset.browser_download_url.startsWith(`${pageUrl.replace('/tag/', '/download/')}/`) || !Number.isSafeInteger(asset.size) || asset.size <= 0) throw new Error('该版本尚未提供适合当前安装渠道的安装包，请稍后重试。');
  return { version: data.tag_name.slice(1), notes: typeof data.body === 'string' ? data.body : '', pageUrl, apk: { url: asset.browser_download_url, size: asset.size } };
}
