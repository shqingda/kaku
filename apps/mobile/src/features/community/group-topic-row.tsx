import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import { formatActivityTime } from '@/lib/format-activity-time';

import type { PublicGroupTopicSummary } from './model';

export function GroupTopicRow({
  hasDivider,
  onPress,
  showGroup,
  topic,
}: {
  hasDivider: boolean;
  onPress: () => void;
  showGroup?: boolean;
  topic: PublicGroupTopicSummary;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const byline = [
    showGroup ? topic.groupTitle ?? '小组' : undefined,
    topic.author,
    formatActivityTime(topic.updatedAt),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityLabel={`打开小组话题：${topic.title}`}
      accessibilityRole="button"
      accessibilityHint="进入话题并查看回复"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        hasDivider && styles.divider,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarFallback}>
          {topic.author.trim().slice(0, 1) || '?'}
        </Text>
        {topic.authorAvatarUrl ? (
          <Image
            contentFit="cover"
            recyclingKey={topic.authorAvatarUrl}
            source={topic.authorAvatarUrl}
            style={StyleSheet.absoluteFill}
            transition={120}
          />
        ) : null}
      </View>
      <View style={styles.main}>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={styles.title}>
          {topic.title}
        </Text>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.meta}>
          {byline}
        </Text>
      </View>
      <View
        accessibilityLabel={`${topic.replyCount} 条回复`}
        accessible
        style={styles.reply}
      >
        <SymbolView
          name={{
            android: 'chat_bubble',
            ios: 'bubble.left.fill',
            web: 'chat_bubble',
          }}
          size={11}
          tintColor={colors.subtle}
        />
        <Text style={styles.replyCount}>{topic.replyCount}</Text>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 90,
    paddingVertical: 15,
  },
  divider: {
    borderTopColor: colors.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 36,
  },
  avatarFallback: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  main: { flex: 1, paddingHorizontal: 12 },
  title: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  meta: {
    color: colors.subtle,
    fontSize: 11,
    marginTop: 7,
  },
  reply: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 13,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minHeight: 27,
    minWidth: 42,
    paddingHorizontal: 8,
  },
  replyCount: {
    color: colors.muted,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  pressed: { opacity: 0.58 },
});
