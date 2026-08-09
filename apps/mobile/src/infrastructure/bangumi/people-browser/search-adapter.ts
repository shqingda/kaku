import type { PublicPersonSummary } from '@/features/people-browser/model';

import type {
  BangumiCharacterSearchPageResponse,
  BangumiEntityDetailResponse,
  BangumiPersonSearchItemResponse,
  BangumiPersonSearchPageResponse,
} from '../api-v0/schemas';

const CAREER_LABELS: Record<string, string> = {
  actor: '演员',
  artist: '音乐人',
  illustrator: '插画家',
  mangaka: '漫画家',
  producer: '制作人',
  seiyu: '声优',
  writer: '作家',
};

const CHARACTER_TYPE_LABELS: Record<number, string> = {
  1: '角色',
  2: '机体',
  3: '舰船',
  4: '组织机构',
};

function infoboxText(value: string | { k?: string; v: string }[]) {
  return typeof value === 'string'
    ? value
    : value.map((item) => item.v).join(' / ');
}

function localizedName(entity: BangumiEntityDetailResponse) {
  const localized = entity.infobox?.find((item) =>
    /^(简体中文名|中文名)$/.test(item.key.trim()),
  );
  return localized
    ? infoboxText(localized.value).trim() || entity.name
    : entity.name;
}

function toPublicPersonSummary(
  entity: BangumiEntityDetailResponse | BangumiPersonSearchItemResponse,
  kind: 'character' | 'person',
): PublicPersonSummary {
  const categories =
    kind === 'person'
      ? (entity.career ?? []).map(
          (career) => CAREER_LABELS[career] ?? career,
        )
      : [CHARACTER_TYPE_LABELS[entity.type] ?? '角色'];
  const metadata =
    (('summary' in entity ? entity.summary : entity.short_summary) ?? '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? '';

  return {
    categories,
    commentCount: 'stat' in entity ? (entity.stat?.comments ?? 0) : 0,
    id: entity.id,
    imageUrl: entity.images?.medium ?? entity.images?.large ?? undefined,
    kind,
    metadata,
    name: 'infobox' in entity ? localizedName(entity) : entity.name,
  };
}

function toSearchPage<
  T extends BangumiEntityDetailResponse | BangumiPersonSearchItemResponse,
>(
  page: { data: T[]; offset: number; total: number },
  kind: 'character' | 'person',
) {
  const nextOffset = page.offset + page.data.length;

  return {
    items: page.data.map((entity) => toPublicPersonSummary(entity, kind)),
    nextOffset:
      page.data.length > 0 && nextOffset < page.total
        ? nextOffset
        : undefined,
    total: page.total,
  };
}

export function toCharacterSearchPage(
  page: BangumiCharacterSearchPageResponse,
) {
  return toSearchPage(page, 'character');
}

export function toPersonSearchPage(page: BangumiPersonSearchPageResponse) {
  return toSearchPage(page, 'person');
}
