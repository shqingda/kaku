import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { usePrefetchSubject } from '@/features/catalog/use-catalog-subject';
import { useTheme } from '@/features/theme/theme-provider';

import {
  prefetchCharacter,
  prefetchPerson,
} from './use-public-entity';

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
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const prefetchSubject = usePrefetchSubject();

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
          onPressIn={() => {
            if (kind === '角色') {
              prefetchPerson(queryClient, item.peer.id);
            } else {
              prefetchCharacter(queryClient, item.peer.id);
            }
          }}
          style={styles.peerRow}
        >
          <View style={styles.peerPortrait}>
            <Text style={styles.fallback}>{item.peer.name.slice(0, 1)}</Text>
            {item.peer.imageUrl ? (
              <Image
                contentFit="cover"
                contentPosition="top"
                recyclingKey={item.peer.imageUrl}
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
          <Chevron color={colors.subtle} />
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
        onPressIn={() => prefetchSubject.prefetch(item.subject.id)}
        onPressOut={prefetchSubject.cancel}
        style={styles.subjectRow}
      >
        <Link.AppleZoom>
          <View style={styles.cover}>
            <Text style={styles.fallback}>{item.subject.title.slice(0, 1)}</Text>
            {item.subject.coverUrl ? (
              <Image
                contentFit="cover"
                recyclingKey={item.subject.coverUrl}
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
        <Chevron color={colors.subtle} />
      </Pressable>
    </Link>
  );
}

function Chevron({ color }: { color: string }) {
  return (
    <SymbolView
      name={{
        android: 'chevron_right',
        ios: 'chevron.right',
        web: 'chevron_right',
      }}
      size={14}
      tintColor={color}
      weight="semibold"
    />
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  sectionHeader: {
    alignSelf: 'stretch',
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 20,
  },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  sectionMeta: { color: colors.subtle, fontSize: 12 },
  empty: { alignItems: 'center', alignSelf: 'stretch', padding: 28 },
  emptyText: { color: colors.muted, fontSize: 14 },
  peerRow: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: 18,
    flexDirection: 'row',
    minHeight: 92,
    padding: 10,
    width: '100%',
  },
  peerPortrait: {
    alignItems: 'center',
    backgroundColor: colors.track,
    borderRadius: 12,
    height: 72,
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    width: 58,
  },
  peerMain: { flex: 1, marginLeft: 13, minWidth: 0 },
  peerName: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  appearance: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  moreAppearances: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  subjectRow: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: 18,
    flexDirection: 'row',
    minHeight: 88,
    padding: 10,
    width: '100%',
  },
  cover: {
    alignItems: 'center',
    backgroundColor: colors.track,
    borderRadius: 11,
    height: 68,
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    width: 48,
  },
  fallback: { color: colors.subtle, fontSize: 14, fontWeight: '700' },
  subjectMain: { flex: 1, marginLeft: 13, minWidth: 0 },
  subjectTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  relation: { color: colors.muted, fontSize: 12, marginTop: 5 },
});
