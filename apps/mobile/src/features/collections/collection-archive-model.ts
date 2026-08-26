import { isCollectionStatus, type CollectionStatus } from '@kaku/shared';

import { getSubjectTypeLabel } from '../catalog/subject-types.ts';
import type { PublicUserCollectionPage } from '../users/model.ts';

export const COLLECTION_ARCHIVE_SUBJECT_TYPES = [2, 1, 3, 4, 6] as const;
export const COLLECTION_ARCHIVE_MAX_ITEMS = 4_000;
export const COLLECTION_ARCHIVE_VERSION = 2;

export type CollectionArchiveItem = {
  collectionStatus?: CollectionStatus;
  id: number;
  progress: number;
  rate?: number;
  subjectType: number;
  title: string;
  totalEpisodes: number;
  updatedAt: string;
  volumeProgress: number;
};

export type CollectionArchive = {
  exportedAt: string;
  items: CollectionArchiveItem[];
  source: 'bangumi-public-collections';
  truncated: boolean;
  username: string;
  version: typeof COLLECTION_ARCHIVE_VERSION;
};

export type CollectionArchiveProgress = {
  loaded: number;
  total: number;
};

export class CollectionArchiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CollectionArchiveError';
  }
}

export async function collectPublicCollectionArchive({
  exportedAt = new Date().toISOString(),
  fetchPage,
  onProgress,
  signal,
  username,
}: {
  exportedAt?: string;
  fetchPage: (
    subjectType: number,
    offset: number,
    signal?: AbortSignal,
  ) => Promise<PublicUserCollectionPage>;
  onProgress?: (progress: CollectionArchiveProgress) => void;
  signal?: AbortSignal;
  username: string;
}): Promise<CollectionArchive> {
  const items: CollectionArchiveItem[] = [];
  let expectedTotal = 0;

  for (const subjectType of COLLECTION_ARCHIVE_SUBJECT_TYPES) {
    throwIfAborted(signal);
    let offset = 0;
    let typeTotal: number | undefined;

    while (true) {
      throwIfAborted(signal);
      const page = await fetchPage(subjectType, offset, signal);
      if (typeTotal === undefined) {
        typeTotal = page.total;
        expectedTotal += page.total;
      }

      for (const item of page.items) {
        if (items.length >= COLLECTION_ARCHIVE_MAX_ITEMS) {
          onProgress?.({ loaded: items.length, total: expectedTotal });
          return {
            exportedAt,
            items,
            source: 'bangumi-public-collections',
            truncated: true,
            username,
            version: COLLECTION_ARCHIVE_VERSION,
          };
        }

        items.push({
          collectionStatus: item.collectionStatus,
          id: item.id,
          progress: item.progress,
          rate: item.rate,
          subjectType: item.subjectType,
          title: item.title,
          totalEpisodes: item.totalEpisodes,
          updatedAt: item.updatedAt,
          volumeProgress: item.volumeProgress,
        });
      }

      onProgress?.({ loaded: items.length, total: expectedTotal });
      if (page.nextOffset === undefined) break;
      offset = page.nextOffset;
    }
  }

  return {
    exportedAt,
    items,
    source: 'bangumi-public-collections',
    truncated: false,
    username,
    version: COLLECTION_ARCHIVE_VERSION,
  };
}

export function buildCollectionArchiveJson(archive: CollectionArchive) {
  return JSON.stringify(archive, null, 2);
}

export function buildCollectionArchiveCsv(archive: CollectionArchive) {
  const header = [
    'id',
    'title',
    'subjectType',
    'subjectTypeLabel',
    'collectionStatus',
    'rate',
    'progress',
    'volumeProgress',
    'totalEpisodes',
    'updatedAt',
  ];
  const rows = archive.items.map((item) =>
    [
      item.id,
      csvField(item.title),
      item.subjectType,
      csvField(getSubjectTypeLabel(item.subjectType)),
      item.collectionStatus ?? '',
      item.rate ?? '',
      item.progress,
      item.volumeProgress,
      item.totalEpisodes,
      csvField(item.updatedAt),
    ].join(','),
  );

  return [header.join(','), ...rows].join('\n');
}

export function parseCollectionArchive(raw: string): CollectionArchive {
  const text = raw.replace(/^\uFEFF/, '').trim();
  if (!text) {
    throw new CollectionArchiveError('备份是空的。');
  }

  if (text.startsWith('{')) {
    return parseCollectionArchiveJson(text);
  }

  return parseCollectionArchiveCsv(text);
}

export function describeCollectionArchive(archive: CollectionArchive) {
  const typeCounts = COLLECTION_ARCHIVE_SUBJECT_TYPES.map((subjectType) => ({
    label: getSubjectTypeLabel(subjectType),
    total: archive.items.filter((item) => item.subjectType === subjectType)
      .length,
  })).filter((item) => item.total > 0);

  return {
    total: archive.items.length,
    truncated: archive.truncated,
    typeCounts,
    username: archive.username,
  };
}

function parseCollectionArchiveJson(text: string): CollectionArchive {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new CollectionArchiveError('JSON 备份无法解析。');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new CollectionArchiveError('备份格式不正确。');
  }

  const body = parsed as Record<string, unknown>;
  if (body.source === 'bangumi-public-collection-totals' || body.version === 1) {
    throw new CollectionArchiveError(
      '这是收藏汇总，不含条目列表。请导出 JSON 或 CSV 后再导入。',
    );
  }

  if (
    body.source !== 'bangumi-public-collections' ||
    body.version !== COLLECTION_ARCHIVE_VERSION ||
    typeof body.username !== 'string' ||
    !body.username.trim() ||
    typeof body.exportedAt !== 'string' ||
    !Array.isArray(body.items)
  ) {
    throw new CollectionArchiveError('不是 Kaku 公开收藏备份。');
  }

  return {
    exportedAt: body.exportedAt,
    items: body.items.map((item, index) => parseArchiveItem(item, index)),
    source: 'bangumi-public-collections',
    truncated: body.truncated === true,
    username: body.username.trim(),
    version: COLLECTION_ARCHIVE_VERSION,
  };
}

function parseCollectionArchiveCsv(text: string): CollectionArchive {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const header = lines[0]?.split(',') ?? [];
  if (header[0] !== 'id' || header[1] !== 'title') {
    throw new CollectionArchiveError('CSV 表头不正确。');
  }

  return {
    exportedAt: new Date(0).toISOString(),
    items: lines.slice(1).map((line, index) => {
      const columns = splitCsvLine(line);
      const id = Number(columns[0]);
      const subjectType = Number(columns[2]);
      const collectionStatus = columns[4];
      const rate = columns[5] ? Number(columns[5]) : undefined;

      if (!Number.isInteger(id) || id <= 0) {
        throw new CollectionArchiveError(`第 ${index + 2} 行条目编号不正确。`);
      }

      return {
        collectionStatus:
          collectionStatus && isCollectionStatus(collectionStatus)
            ? collectionStatus
            : undefined,
        id,
        progress: Number(columns[6] || 0),
        rate:
          rate !== undefined && Number.isInteger(rate) && rate >= 1 && rate <= 10
            ? rate
            : undefined,
        subjectType: Number.isInteger(subjectType) ? subjectType : 2,
        title: columns[1]?.trim() || `条目 ${id}`,
        totalEpisodes: Number(columns[8] || 0),
        updatedAt: columns[9] ?? '',
        volumeProgress: Number(columns[7] || 0),
      };
    }),
    source: 'bangumi-public-collections',
    truncated: false,
    username: 'imported',
    version: COLLECTION_ARCHIVE_VERSION,
  };
}

function parseArchiveItem(value: unknown, index: number): CollectionArchiveItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CollectionArchiveError(`第 ${index + 1} 条收藏格式不正确。`);
  }

  const item = value as Record<string, unknown>;
  const id = item.id;
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
    throw new CollectionArchiveError(`第 ${index + 1} 条收藏编号不正确。`);
  }

  return {
    collectionStatus: isCollectionStatus(item.collectionStatus)
      ? item.collectionStatus
      : undefined,
    id,
    progress: asNonNegativeInt(item.progress),
    rate:
      typeof item.rate === 'number' &&
      Number.isInteger(item.rate) &&
      item.rate >= 1 &&
      item.rate <= 10
        ? item.rate
        : undefined,
    subjectType:
      typeof item.subjectType === 'number' && Number.isInteger(item.subjectType)
        ? item.subjectType
        : 2,
    title: typeof item.title === 'string' && item.title.trim() ? item.title : `条目 ${id}`,
    totalEpisodes: asNonNegativeInt(item.totalEpisodes),
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : '',
    volumeProgress: asNonNegativeInt(item.volumeProgress),
  };
}

function asNonNegativeInt(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

function csvField(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function splitCsvLine(line: string) {
  const columns: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }

    if (char === ',') {
      columns.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  columns.push(current);
  return columns;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new CollectionArchiveError('已取消导出。');
  }
}
