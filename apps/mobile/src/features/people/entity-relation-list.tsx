import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';

import type {
  EntityRelatedPeer,
  EntityRelatedSubject,
  PublicEntityDetail,
} from './model';

export type EntityListItem =
  | { id: string; kind: 'empty'; text: string }
  | { id: string; kind: 'peer'; peer: EntityRelatedPeer }
  | { count: number; id: string; kind: 'section'; title: string }
  | { id: string; kind: 'subject'; subject: EntityRelatedSubject };

export function buildEntityListItems(
  data: PublicEntityDetail,
  kind: '人物' | '角色',
): EntityListItem[] {
  const peerTitle = kind === '角色' ? '关联人物' : '出演角色';
  const subjectTitle = kind === '角色' ? '相关作品' : '参与作品';
  const relatedPeers = data.relatedPeers ?? [];
  const items: EntityListItem[] = [
    {
      count: relatedPeers.length,
      id: 'peer-section',
      kind: 'section',
      title: peerTitle,
    },
  ];

  items.push(
    ...(relatedPeers.length > 0
      ? relatedPeers.map((peer) => ({
          id: `peer-${peer.id}`,
          kind: 'peer' as const,
          peer,
        }))
      : [
          {
            id: 'peer-empty',
            kind: 'empty' as const,
            text: `暂无${peerTitle}。`,
          },
        ]),
  );

  items.push({
    count: data.relatedSubjects.length,
    id: 'subject-section',
    kind: 'section',
    title: subjectTitle,
  });
  items.push(
    ...(data.relatedSubjects.length > 0
      ? data.relatedSubjects.map((subject, index) => ({
          id: `subject-${subject.id}-${subject.relation}-${index}`,
          kind: 'subject' as const,
          subject,
        }))
      : [
          {
            id: 'subject-empty',
            kind: 'empty' as const,
            text: `暂无${subjectTitle}。`,
          },
        ]),
  );

  return items;
}

export function EntityRelationRow({
  item,
  kind,
}: {
  item: EntityListItem;
  kind: '人物' | '角色';
}) {
  if (item.kind === 'section') {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{item.title}</Text>
        <Text style={styles.sectionMeta}>{item.count} 项</Text>
      </View>
    );
  }

  if (item.kind === 'empty') {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{item.text}</Text>
      </View>
    );
  }

  if (item.kind === 'peer') {
    const pathname = kind === '角色' ? '/person/[id]' : '/character/[id]';

    return (
      <Link
        asChild
        href={{ pathname, params: { id: String(item.peer.id) } }}
      >
        <Pressable
          accessibilityHint={`进入${kind === '角色' ? '人物' : '角色'}详情`}
          accessibilityLabel={`打开${item.peer.name}`}
          accessibilityRole="button"
          hitSlop={4}
          style={({ pressed }) => [
            styles.peerRow,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.peerPortrait}>
            <Text style={styles.fallback}>{item.peer.name.slice(0, 1)}</Text>
            {item.peer.imageUrl ? (
              <Image
                contentFit="cover"
                contentPosition="top"
                source={item.peer.imageUrl}
                style={StyleSheet.absoluteFill}
                transition={120}
              />
            ) : null}
          </View>
          <View style={styles.peerMain}>
            <Text numberOfLines={1} style={styles.peerName}>
              {item.peer.name}
            </Text>
            {item.peer.appearances.slice(0, 2).map((appearance, index) => (
              <Text
                key={`${appearance.subjectId}-${appearance.relation}-${index}`}
                numberOfLines={1}
                style={styles.appearance}
              >
                {appearance.subjectTitle}
                {appearance.relation ? ` · ${appearance.relation}` : ''}
              </Text>
            ))}
            {item.peer.appearances.length > 2 ? (
              <Text style={styles.moreAppearances}>
                另有 {item.peer.appearances.length - 2} 部作品
              </Text>
            ) : null}
          </View>
          <Chevron />
        </Pressable>
      </Link>
    );
  }

  return (
    <Link
      asChild
      href={{
        pathname: '/subject/[id]',
        params: { id: String(item.subject.id) },
      }}
    >
      <Pressable
        accessibilityHint="进入相关作品详情"
        accessibilityLabel={`打开${item.subject.title}`}
        accessibilityRole="button"
        hitSlop={4}
        style={({ pressed }) => [
          styles.subjectRow,
          pressed && styles.pressed,
        ]}
      >
        <Link.AppleZoom>
          <View style={styles.cover}>
            <Text style={styles.fallback}>{item.subject.title.slice(0, 1)}</Text>
            {item.subject.coverUrl ? (
              <Image
                contentFit="cover"
                source={item.subject.coverUrl}
                style={StyleSheet.absoluteFill}
                transition={120}
              />
            ) : null}
          </View>
        </Link.AppleZoom>
        <View style={styles.subjectMain}>
          <Text numberOfLines={2} style={styles.subjectTitle}>
            {item.subject.title}
          </Text>
          <Text style={styles.relation}>{item.subject.relation}</Text>
        </View>
        <Chevron />
      </Pressable>
    </Link>
  );
}

function Chevron() {
  return (
    <SymbolView
      name={{
        android: 'chevron_right',
        ios: 'chevron.right',
        web: 'chevron_right',
      }}
      size={14}
      tintColor={COLORS.subtle}
      weight="semibold"
    />
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 20,
  },
  sectionTitle: { color: COLORS.ink, fontSize: 19, fontWeight: '800' },
  sectionMeta: { color: COLORS.subtle, fontSize: 12 },
  empty: { alignItems: 'center', padding: 28 },
  emptyText: { color: COLORS.muted, fontSize: 14 },
  peerRow: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    flexDirection: 'row',
    minHeight: 92,
    padding: 10,
  },
  peerPortrait: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 12,
    height: 72,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 58,
  },
  peerMain: { flex: 1, marginLeft: 13 },
  peerName: { color: COLORS.ink, fontSize: 15, fontWeight: '800' },
  appearance: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  moreAppearances: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  subjectRow: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    flexDirection: 'row',
    minHeight: 88,
    padding: 10,
  },
  cover: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 11,
    height: 68,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
  },
  fallback: { color: COLORS.subtle, fontSize: 14, fontWeight: '700' },
  subjectMain: { flex: 1, marginLeft: 13 },
  subjectTitle: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  relation: { color: COLORS.muted, fontSize: 12, marginTop: 5 },
  pressed: { opacity: 0.58 },
});
