export type TextSelection = { end: number; start: number };

export function insertAtSelection(
  content: string,
  insertion: string,
  selection: TextSelection,
  maxLength: number,
) {
  const from = Math.max(0, Math.min(selection.start, selection.end, content.length));
  const to = Math.max(from, Math.min(Math.max(selection.start, selection.end), content.length));
  const next = content.slice(0, from) + insertion + content.slice(to);

  if (next.length > maxLength) {
    return null;
  }

  const cursor = from + insertion.length;
  return { content: next, selection: { start: cursor, end: cursor } };
}

export function imageUrlError(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '请先粘贴图片链接';
  }

  if (trimmed.length > 2048) {
    return '图片链接过长，请换一个更短的链接';
  }

  try {
    const url = new URL(trimmed);
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname) {
      return '请输入以 http:// 或 https:// 开头的图片链接';
    }
  } catch {
    return '请输入完整有效的图片链接';
  }

  return null;
}

export function imageBbcode(value: string) {
  return `[img]${value.trim()}[/img]`;
}
