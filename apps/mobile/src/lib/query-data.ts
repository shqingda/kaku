type InfiniteQueryData = {
  pages?: unknown;
};

type ItemListData = {
  items?: unknown;
};

export function readInfinitePages<T>(data: unknown): T[] {
  if (!isRecord(data) || !Array.isArray((data as InfiniteQueryData).pages)) {
    return [];
  }

  return (data as { pages: T[] }).pages;
}

export function readQueryItems<T>(data: unknown): T[] {
  if (!isRecord(data) || !Array.isArray((data as ItemListData).items)) {
    return [];
  }

  return (data as { items: T[] }).items;
}

export function readQueryArray<T>(data: unknown): T[] {
  return Array.isArray(data) ? data as T[] : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
