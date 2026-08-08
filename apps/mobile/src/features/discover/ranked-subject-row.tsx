import { Image } from 'expo-image';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/design';

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
  return (
    <Pressable
      accessibilityLabel={`排行榜第 ${position} 名：${item.title}`}
      accessibilityRole="button"
      onPress={onPress}
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
            source={item.coverUrl}
            style={StyleSheet.absoluteFill}
            transition={Platform.OS === 'ios' ? 120 : 0}
          />
        ) : null}
      </View>
      <View style={styles.main}>
        <Text numberOfLines={2} style={styles.title}>
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

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 92,
    paddingVertical: 10,
  },
  divider: {
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  position: {
    color: COLORS.accent,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    textAlign: 'center',
    width: 32,
  },
  regularPosition: { color: COLORS.muted },
  cover: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 9,
    height: 70,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 50,
  },
  coverFallback: {
    color: COLORS.subtle,
    fontSize: 16,
    fontWeight: '700',
  },
  main: { flex: 1, marginLeft: 14 },
  title: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  meta: {
    color: COLORS.subtle,
    fontSize: 12,
    marginTop: 7,
  },
  chevron: {
    color: COLORS.subtle,
    fontSize: 26,
    marginLeft: 8,
  },
  pressed: { opacity: 0.62 },
});
