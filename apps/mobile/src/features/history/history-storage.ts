// Both history stores accept their old array format and the current envelope.
// Corrupt storage is never interpreted as an empty history ready to overwrite.
export function parseStoredHistory<T>(
  raw: string | null,
  parse: (value: unknown) => { items: T[]; updatedAt: number | null },
) {
  if (raw === null) return { items: [], updatedAt: null };
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) {
    if (!value || typeof value !== 'object' || !('items' in value) || !Array.isArray(value.items)) {
      throw new Error('本机历史格式无法读取');
    }
    if (!('updatedAt' in value) || (value.updatedAt !== null && (
      typeof value.updatedAt !== 'number' || !Number.isFinite(value.updatedAt) || value.updatedAt < 0
    ))) {
      throw new Error('本机历史时间格式无法读取');
    }
  }
  return parse(value);
}
