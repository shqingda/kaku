import type {
  EntityMetadata,
  EntityRelatedPeer,
  PublicEntityDetail,
} from '../../../features/people/model.ts';
import type {
  BangumiEntityDetailResponse,
  BangumiEntityRelationsResponse,
  BangumiEntitySubjectsResponse,
} from '../api-v0/schemas.ts';

const CAREER_LABELS = {
  actor: '演员',
  artist: '音乐人',
  illustrator: '插画家',
  mangaka: '漫画家',
  producer: '制作人',
  seiyu: '声优',
  writer: '作家',
} as const;

const CHARACTER_TYPE_LABELS: Record<number, string> = {
  1: '角色',
  2: '机体',
  3: '舰船',
  4: '组织',
};

const PERSON_TYPE_LABELS: Record<number, string> = {
  1: '个人',
  2: '公司',
  3: '组合',
};

function valueToText(value: string | { k?: string; v: string }[]) {
  return typeof value === 'string'
    ? value
    : value.map((item) => item.v).join(' / ');
}

function toMetadata(detail: BangumiEntityDetailResponse): EntityMetadata[] {
  const metadata =
    detail.infobox?.map((item) => ({
      label: item.key,
      value: valueToText(item.value),
    })) ?? [];
  const birthday = [detail.birth_year, detail.birth_mon, detail.birth_day]
    .filter((value): value is number => typeof value === 'number')
    .join('-');

  if (birthday && !metadata.some((item) => item.label === '生日')) {
    metadata.unshift({ label: '生日', value: birthday });
  }
  if (detail.gender && !metadata.some((item) => item.label === '性别')) {
    metadata.unshift({ label: '性别', value: detail.gender });
  }

  return metadata;
}

function groupRelatedPeers(
  relations: BangumiEntityRelationsResponse,
): EntityRelatedPeer[] {
  const peers = new Map<number, EntityRelatedPeer>();

  for (const relation of relations) {
    const appearance = {
      relation: relation.staff,
      subjectId: relation.subject_id,
      subjectTitle:
        relation.subject_name_cn.trim() || relation.subject_name,
    };
    const peer = peers.get(relation.id);

    if (peer) {
      peer.appearances.push(appearance);
      continue;
    }

    peers.set(relation.id, {
      appearances: [appearance],
      id: relation.id,
      imageUrl:
        relation.images?.medium ?? relation.images?.large ?? undefined,
      name: relation.name,
    });
  }

  return [...peers.values()];
}

export function mapBangumiEntityDetail(
  detail: BangumiEntityDetailResponse,
  subjects: BangumiEntitySubjectsResponse,
  peers: BangumiEntityRelationsResponse,
  kind: 'character' | 'person',
): PublicEntityDetail {
  const categoryLabels =
    kind === 'person' && detail.career?.length
      ? detail.career.map((career) => CAREER_LABELS[career])
      : [
          (kind === 'character'
            ? CHARACTER_TYPE_LABELS
            : PERSON_TYPE_LABELS)[detail.type] ??
            (kind === 'character' ? '角色' : '人物'),
        ];

  return {
    categoryLabels,
    collectionCount: detail.stat?.collects ?? 0,
    commentCount: detail.stat?.comments ?? 0,
    id: detail.id,
    imageUrl: detail.images?.large ?? detail.images?.medium,
    metadata: toMetadata(detail),
    name: detail.name,
    relatedPeers: groupRelatedPeers(peers),
    relatedSubjects: subjects.map((subject) => ({
      coverUrl: subject.image || undefined,
      id: subject.id,
      relation: subject.staff,
      title: subject.name_cn.trim() || subject.name,
      type: subject.type,
    })),
    summary: detail.summary,
  };
}
