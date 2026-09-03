import { Image } from 'expo-image';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ThemeColors } from '@/constants/theme';
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
    <Pressable
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
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 92,
    paddingVertical: 10,
  },
  divider: {
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  position: {
    color: colors.accent,
    fontSize: 15,
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
    fontSize: 16,
    fontWeight: '700',
  },
  main: { flex: 1, marginLeft: 14 },
  title: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  meta: {
    color: colors.subtle,
    fontSize: 12,
    marginTop: 7,
  },
  chevron: {
    color: colors.subtle,
    fontSize: 26,
    marginLeft: 8,
  },
  pressed: { opacity: 0.62 },
});
