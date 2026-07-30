import type { CollectionStatus } from '@/features/watching/model';

export const SUBJECT_TYPES = [
  { id: 2, label: '动画' },
  { id: 1, label: '书籍' },
  { id: 3, label: '音乐' },
  { id: 4, label: '游戏' },
  { id: 6, label: '三次元' },
] as const;

const STATUS_LABELS: Record<
  number,
  Record<CollectionStatus, string>
> = {
  1: {
    completed: '读过',
    doing: '在读',
    dropped: '抛弃',
    onHold: '搁置',
    wish: '想读',
  },
  3: {
    completed: '听过',
    doing: '在听',
    dropped: '抛弃',
    onHold: '搁置',
    wish: '想听',
  },
  4: {
    completed: '玩过',
    doing: '在玩',
    dropped: '抛弃',
    onHold: '搁置',
    wish: '想玩',
  },
};

const WATCH_STATUS_LABELS: Record<CollectionStatus, string> = {
  completed: '看过',
  doing: '在看',
  dropped: '抛弃',
  onHold: '搁置',
  wish: '想看',
};

export function getCollectionStatusLabel(
  subjectType: number,
  status: CollectionStatus,
) {
  return STATUS_LABELS[subjectType]?.[status] ?? WATCH_STATUS_LABELS[status];
}

export function getSubjectTypeLabel(subjectType?: number) {
  return (
    SUBJECT_TYPES.find((item) => item.id === subjectType)?.label ?? '条目'
  );
}

export function supportsWatchProgress(subjectType: number) {
  return subjectType === 2 || subjectType === 6;
}

export function usesEpisodeData(subjectType: number) {
  return supportsWatchProgress(subjectType) || subjectType === 3;
}

export function getSubjectDetailLabels(subjectType: number) {
  switch (subjectType) {
    case 1:
      return {
        characters: {
          hint: '角色与人物资料',
          label: '角色与人物',
        },
        credits: {
          hint: '作者、插画与参与信息',
          label: '作者与创作',
          pageTitle: '完整创作名单',
        },
      };
    case 3:
      return {
        credits: {
          hint: '艺术家与完整制作信息',
          label: '艺术家与制作',
          pageTitle: '完整制作名单',
        },
      };
    case 4:
      return {
        characters: {
          hint: '角色与人物资料',
          label: '角色与人物',
        },
        credits: {
          hint: '开发与参与信息',
          label: '制作人员',
          pageTitle: '完整制作名单',
        },
      };
    case 6:
      return {
        characters: {
          hint: '角色介绍与演出阵容',
          label: '角色与声优',
        },
        credits: {
          hint: '演员与幕后参与信息',
          label: '演职人员',
          pageTitle: '完整演职名单',
        },
      };
    default:
      return {
        characters: {
          hint: '角色介绍与演出阵容',
          label: '角色与声优',
        },
        credits: {
          hint: '完整职位与参与信息',
          label: '制作人员',
          pageTitle: '完整制作名单',
        },
      };
  }
}
