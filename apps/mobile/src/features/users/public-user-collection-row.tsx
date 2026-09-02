import { useMemo, type ReactNode } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import {
  getCollectionStatusLabel,
  supportsWatchProgress,
} from '@/features/catalog/subject-types';
import { usePrefetchSubject } from '@/features/catalog/use-catalog-subject';
import { useTheme } from '@/features/theme/theme-provider';

import type { PublicUserCollection } from './model';

export function PublicUserCollectionRow({
  hasDivider,
  item,
  onPress,
  trailing,
}: {
  hasDivider?: boolean;
  item: PublicUserCollection;
  onPress: () => void;
  trailing?: ReactNode;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const prefetchSubject = usePrefetchSubject();

  const progress =
    supportsWatchProgress(item.subjectType) && item.progress > 0
      ? `${item.progress}${item.totalEpisodes > 0 ? `/${item.totalEpisodes}` : ''} 集`
      : undefined;
  const meta = [
    item.collectionStatus
      ? getCollectionStatusLabel(item.subjectType, item.collectionStatus)
      : '收藏',
    progress,
    item.rate ? `${item.rate} 分` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityLabel={`打开收藏条目：${item.title}`}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => prefetchSubject.prefetch(item.id)}
      onPressOut={prefetchSubject.cancel}
      style={({ pressed }) => [
        styles.row,
        hasDivider && styles.divider,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.cover}>
        <Text style={styles.coverFallback}>
          {item.title.slice(0, 1)}
        </Text>
        {item.coverUrl ? (
          <Image
            contentFit="cover"
            recyclingKey={item.coverUrl}
            source={item.coverUrl}
            style={StyleSheet.absoluteFill}
            transition={120}
          />
        ) : null}
      </View>
      <View style={styles.main}>
        <Text numberOfLines={2} style={styles.title}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {meta}
        </Text>
      </View>
      {trailing ?? <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 98,
    paddingVertical: 11,
  },
  divider: {
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cover: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 11,
    height: 76,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 54,
  },
  coverFallback: {
    color: colors.subtle,
    fontSize: 14,
    fontWeight: '700',
  },
  main: { flex: 1, marginLeft: 13 },
  title: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 7,
  },
  chevron: {
    color: colors.subtle,
    fontSize: 24,
    marginLeft: 8,
  },
  pressed: { opacity: 0.62 },
});
