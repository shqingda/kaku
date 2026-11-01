import { Image } from 'expo-image';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { PressableScale } from '@/features/shared/pressable-scale';
import { useTheme } from '@/features/theme/theme-provider';

import { usePrefetchSubject } from '@/features/catalog/use-catalog-subject';

import type { DiscoverSubject } from './model';

export function RankedSubjectRow({
  hasDivider,
  item,
  onPress,
  position,
}: {
  hasDivider: boolean;
  item: DiscoverSubject;
  onPress: () => void;
  position: number;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const prefetchSubject = usePrefetchSubject();

  return (
    <PressableScale
      accessibilityLabel={`排行榜第 ${position} 名：${item.title}`}
      accessibilityRole="button"
      accessibilityHint="进入条目详情"
      onPress={onPress}
      onPressIn={() => prefetchSubject.prefetch(item.id)}
      onPressOut={prefetchSubject.cancel}
      style={({ pressed }) => [
        styles.row,
        hasDivider && styles.divider,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.position,
          position > 3 && styles.regularPosition,
        ]}
      >
        {position}
      </Text>
      <View style={styles.cover}>
        <Text style={styles.coverFallback}>{item.title.slice(0, 1)}</Text>
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
        <Text style={styles.meta}>
          {item.score ? `${item.score.toFixed(1)} 分` : '暂无评分'}
          {item.date ? ` · ${item.date.slice(0, 4)}` : ''}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </PressableScale>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 92,
    paddingVertical: SPACING.md,
  },
  divider: {
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  position: {
    color: colors.accent,
    ...TYPE.body,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    textAlign: 'center',
    width: 32,
  },
  regularPosition: { color: colors.muted },
  cover: {
    alignItems: 'center',
    backgroundColor: colors.track,
    borderRadius: 9,
    height: 70,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 50,
  },
  coverFallback: {
    color: colors.subtle,
    ...TYPE.heading,
    fontWeight: '700',
  },
  main: { flex: 1, marginLeft: SPACING.md },
  title: {
    color: colors.ink,
    ...TYPE.body,
    fontWeight: '700',
  },
  meta: {
    color: colors.subtle,
    ...TYPE.caption,
    marginTop: SPACING.sm,
  },
  chevron: {
    color: colors.subtle,
    ...TYPE.display,
    marginLeft: SPACING.sm,
  },
  pressed: { opacity: 0.62 },
});
