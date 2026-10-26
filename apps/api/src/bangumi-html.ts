// Helpers shared by the Bangumi web-page scrapers. Each scraper used to carry
// its own copy; the variants differed only in the ways expressed by the options
// below, so keep those differences explicit rather than silently unifying them.

export const MAX_HTML_BYTES = 1_000_000;

export function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // Last, so "&amp;lt;" stays the literal text "&lt;".
    .replace(/&amp;/g, '&');
}

// Strips tags before decoding entities, so escaped markup such as "&lt;b&gt;"
// survives as text. With lineBreaks, "<br>" separates words instead of joining them.
export function htmlToText(value: string, { lineBreaks = true } = {}) {
  const withBreaks = lineBreaks ? value.replace(/<br\s*\/?>/gi, '\n') : value;
  return decodeEntities(withBreaks.replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

export async function readBoundedHtml(response: Response, tooLarge: () => Error) {
  if (!response.body) return '';

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let byteLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > MAX_HTML_BYTES) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(decoder.decode(value, { stream: true }));
  }
  chunks.push(decoder.decode());
  return chunks.join('');
}

export function secureUrl(value?: string) {
  if (!value) return undefined;
  if (value.startsWith('//')) return `https:${value}`;
  return value.replace(/^http:/, 'https:');
}

// Bangumi pages print times in Beijing time (UTC+8) without a zone.
export function toBangumiUnixTime(match: RegExpMatchArray) {
  const [, year, month, day, hour, minute] = match.map(Number);
  return Math.floor(Date.UTC(year, month - 1, day, hour - 8, minute) / 1000);
}

export function parseBangumiTime(value: string) {
  const match = value.match(/(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/);
  return match ? toBangumiUnixTime(match) : 0;
}
