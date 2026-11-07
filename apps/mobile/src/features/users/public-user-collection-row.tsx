import { type ReactNode } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SPACING, TYPE } from '@/constants/design';
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
  const styles = createStyles(colors);
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
        <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={styles.title}>
          {item.title}
        </Text>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.meta}>
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
    paddingVertical: SPACING.md,
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
    ...TYPE.body,
    fontWeight: '700',
  },
  main: { flex: 1, marginLeft: SPACING.md },
  title: {
    color: colors.ink,
    ...TYPE.body,
    fontWeight: '700',
  },
  meta: {
    color: colors.muted,
    ...TYPE.caption,
    marginTop: SPACING.sm,
  },
  chevron: {
    color: colors.subtle,
    ...TYPE.titleLarge,
    marginLeft: SPACING.sm,
  },
  pressed: { opacity: 0.62 },
});
