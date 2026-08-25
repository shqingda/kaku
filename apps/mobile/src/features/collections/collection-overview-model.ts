import { getSubjectTypeLabel } from '../catalog/subject-types.ts';

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
