import type { CollectionStatus } from '../watching/model.ts';
import {
  getCollectionStatusLabel,
  getSubjectTypeLabel,
} from '../catalog/subject-types.ts';

export type CollectionTypeTotal = {
  subjectType: number;
  total: number;
};

export type CollectionOverview = {
  items: Array<
    CollectionTypeTotal & {
      label: string;
      percentage: number;
    }
  >;
  total: number;
};

export type CollectionStatusTotal = {
  status: CollectionStatus;
  total: number;
};

export type CollectionStatusAnalysis = {
  active: number;
  backlog: number;
  completed: number;
  completionRate: number;
  items: Array<
    CollectionStatusTotal & {
      label: string;
      percentage: number;
    }
  >;
  total: number;
};

export function buildCollectionOverview(
  typeTotals: CollectionTypeTotal[],
): CollectionOverview {
  const total = typeTotals.reduce((sum, item) => sum + item.total, 0);

  return {
    items: typeTotals.map((item) => ({
      ...item,
      label: getSubjectTypeLabel(item.subjectType),
      percentage: total > 0 ? (item.total / total) * 100 : 0,
    })),
    total,
  };
}

export function buildCollectionStatusAnalysis(
  subjectType: number,
  statusTotals: CollectionStatusTotal[],
): CollectionStatusAnalysis {
  const total = statusTotals.reduce((sum, item) => sum + item.total, 0);
  const getTotal = (status: CollectionStatus) =>
    statusTotals.find((item) => item.status === status)?.total ?? 0;
  const completed = getTotal('completed');
  const startedTotal = total - getTotal('wish');

  return {
    active: getTotal('doing'),
    backlog: getTotal('wish') + getTotal('onHold'),
    completed,
    completionRate: startedTotal > 0 ? (completed / startedTotal) * 100 : 0,
    items: statusTotals.map((item) => ({
      ...item,
      label: getCollectionStatusLabel(subjectType, item.status),
      percentage: total > 0 ? (item.total / total) * 100 : 0,
    })),
    total,
  };
}

export function buildCollectionOverviewShareText(
  overview: CollectionOverview,
  username: string,
) {
  const rows = overview.items.map(
    (item) =>
      `${item.label} ${item.total.toLocaleString('zh-CN')} 部（${item.percentage.toLocaleString('zh-CN', { maximumFractionDigits: 1 })}%）`,
  );

  return [
    'Kaku 收藏分析',
    `@${username} · 共 ${overview.total.toLocaleString('zh-CN')} 部`,
    '',
    ...rows,
    '',
    '数据来自 Bangumi 当前公开收藏总数。',
  ].join('\n');
}

export function buildCollectionOverviewJson(
  overview: CollectionOverview,
  username: string,
) {
  return JSON.stringify(
    {
      source: 'bangumi-public-collection-totals',
      total: overview.total,
      types: overview.items.map(({ label, subjectType, total }) => ({
        label,
        subjectType,
        total,
      })),
      username,
      version: 1,
    },
    null,
    2,
  );
}
