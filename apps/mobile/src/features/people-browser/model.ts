export type PeopleKind = 'character' | 'person';
export type PeopleSort = 'collects' | 'comment' | 'dateline' | 'title';

export type PublicPersonSummary = {
  categories: string[];
  commentCount: number;
  id: number;
  imageUrl?: string;
  kind: PeopleKind;
  metadata: string;
  name: string;
};

export type GlobalPeoplePage = {
  items: PublicPersonSummary[];
  nextPage?: number;
  page: number;
  totalPages?: number;
};

export const PEOPLE_KINDS: { id: PeopleKind; label: string }[] = [
  { id: 'character', label: '虚构角色' },
  { id: 'person', label: '现实人物' },
];

export const PEOPLE_SORTS: { id: PeopleSort; label: string }[] = [
  { id: 'dateline', label: '最新' },
  { id: 'collects', label: '收藏' },
  { id: 'comment', label: '讨论' },
  { id: 'title', label: '名称' },
];

export const CHARACTER_TYPES = [
  { id: undefined, label: '全部' },
  { id: 1, label: '角色' },
  { id: 2, label: '机体' },
  { id: 3, label: '舰船' },
  { id: 4, label: '组织机构' },
];

export const PERSON_TYPES = [
  { id: undefined, label: '全部' },
  { id: 1, label: '声优' },
  { id: 2, label: '漫画家' },
  { id: 7, label: '绘师' },
  { id: 3, label: '制作人' },
  { id: 4, label: '音乐人' },
  { id: 8, label: '作家' },
  { id: 6, label: '演员' },
];

export const PEOPLE_GENDERS = [
  { id: undefined, label: '不限性别' },
  { id: 1, label: '男性' },
  { id: 2, label: '女性' },
];
