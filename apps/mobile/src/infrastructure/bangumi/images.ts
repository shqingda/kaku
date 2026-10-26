const BANGUMI_PIC_PREFIX = 'https://lain.bgm.tv/pic/';

export function secureImage(url?: string) {
  return url?.replace(/^http:/, 'https:');
}

// Some endpoints only return the original image, which can be 4096 px and decode
// to ~45 MB. Bangumi's /r/<width>/ resizer serves the same picture at list size.
export function toResizedImage(url: string | null | undefined, width: number) {
  if (!url) return undefined;
  return url.startsWith(BANGUMI_PIC_PREFIX)
    ? `https://lain.bgm.tv/r/${width}/pic/${url.slice(BANGUMI_PIC_PREFIX.length)}`
    : url;
}
