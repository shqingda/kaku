import { getSubjectTypeLabel } from '../catalog/subject-types.ts';
import type { RecentSubject } from './recent-subjects-model';

export type BrowsingFootprint = {
  activeDays: number;
  latestViewedAt: number | null;
  typeCounts: { count: number; label: string; type: number }[];
  uniqueSubjects: number;
};

export function buildBrowsingFootprint(
  items: RecentSubject[],
): BrowsingFootprint {
  const days = new Set(
    items.map((item) => new Date(item.viewedAt).toISOString().slice(0, 10)),
  );
  const counts = new Map<number, number>();
  for (const item of items) {
    counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
  }

  return {
    activeDays: days.size,
    latestViewedAt: items.length
      ? Math.max(...items.map((item) => item.viewedAt))
      : null,
    typeCounts: [...counts.entries()]
      .map(([type, count]) => ({
        count,
        label: getSubjectTypeLabel(type),
        type,
      }))
    .sort(
      (left, right) => right.count - left.count || left.type - right.type,
    ),
    uniqueSubjects: new Set(items.map((item) => item.id)).size,
  };
}
